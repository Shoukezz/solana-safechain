use anchor_lang::prelude::*;

declare_id!("CTChmby72HzRKRZ2KeytRPF4AQeVkmnW6qGNCgwLhmA6");

const MAX_COMMENT_LEN: usize = 280;
const SCORE_ALPHA_BPS: u32 = 3500; // 35% new review, 65% historical score
const COOLDOWN_SECONDS: i64 = 60;
const FLAG_MIN_REVIEWS: u32 = 5;
const FLAG_LOW_RATING_PERCENT: u32 = 60;

#[program]
pub mod safechain {
    use super::*;

    pub fn create_user(ctx: Context<CreateUser>) -> Result<()> {
        let user = &mut ctx.accounts.user;
        user.wallet = ctx.accounts.authority.key();
        user.score = 50;
        user.review_count = 0;
        user.low_rating_count = 0;
        user.flagged = false;
        user.last_review_ts = 0;
        user.bump = ctx.bumps.user;

        emit!(UserCreated {
            wallet: user.wallet,
            score: user.score,
            ts: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn add_review(ctx: Context<AddReview>, rating: u8, comment: String) -> Result<()> {
        require!((1..=5).contains(&rating), SafeChainError::InvalidRating);
        require!(
            comment.as_bytes().len() <= MAX_COMMENT_LEN,
            SafeChainError::CommentTooLong
        );

        let now = Clock::get()?.unix_timestamp;
        let reviewer_user = &mut ctx.accounts.reviewer_user;
        require!(
            now - reviewer_user.last_review_ts >= COOLDOWN_SECONDS,
            SafeChainError::CooldownNotPassed
        );

        let reviewer = ctx.accounts.reviewer.key();
        let target_wallet = ctx.accounts.target.key();

        initialize_user_if_needed(&mut ctx.accounts.target_user, target_wallet, ctx.bumps.target_user);
        require!(reviewer != target_wallet, SafeChainError::SelfReviewForbidden);

        let review = &mut ctx.accounts.review;
        review.reviewer = reviewer;
        review.target = target_wallet;
        review.rating = rating;
        review.comment = comment;
        review.timestamp = now;
        review.applied = false;
        review.bump = ctx.bumps.review;

        apply_review_to_target(&mut ctx.accounts.target_user, rating)?;
        review.applied = true;
        reviewer_user.last_review_ts = now;

        emit!(ReviewAdded {
            reviewer,
            target: target_wallet,
            rating,
            ts: now,
        });

        Ok(())
    }

    pub fn update_score(ctx: Context<UpdateScore>) -> Result<()> {
        let review = &mut ctx.accounts.review;
        require!(!review.applied, SafeChainError::ReviewAlreadyApplied);

        apply_review_to_target(&mut ctx.accounts.target_user, review.rating)?;
        review.applied = true;

        emit!(ScoreUpdated {
            wallet: ctx.accounts.target_user.wallet,
            score: ctx.accounts.target_user.score,
            review_count: ctx.accounts.target_user.review_count,
            flagged: ctx.accounts.target_user.flagged,
            ts: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

fn apply_review_to_target(user: &mut Account<UserAccount>, rating: u8) -> Result<()> {
    let incoming_score = rating_to_score(rating);
    let old_score = user.score as u32;
    let new_score = ((old_score * (10_000 - SCORE_ALPHA_BPS))
        + (incoming_score * SCORE_ALPHA_BPS))
        / 10_000;

    user.score = new_score as u8;
    user.review_count = user
        .review_count
        .checked_add(1)
        .ok_or(SafeChainError::MathOverflow)?;

    if rating <= 2 {
        user.low_rating_count = user
            .low_rating_count
            .checked_add(1)
            .ok_or(SafeChainError::MathOverflow)?;
    }

    if user.review_count >= FLAG_MIN_REVIEWS {
        let low_ratio = user
            .low_rating_count
            .checked_mul(100)
            .ok_or(SafeChainError::MathOverflow)?
            / user.review_count;
        user.flagged = low_ratio >= FLAG_LOW_RATING_PERCENT;
    }

    Ok(())
}

fn initialize_user_if_needed(user: &mut Account<UserAccount>, wallet: Pubkey, bump: u8) {
    if user.wallet == Pubkey::default() {
        user.wallet = wallet;
        user.score = 50;
        user.review_count = 0;
        user.low_rating_count = 0;
        user.flagged = false;
        user.last_review_ts = 0;
        user.bump = bump;
    }
}

fn rating_to_score(rating: u8) -> u32 {
    ((rating.saturating_sub(1)) as u32) * 25
}

#[derive(Accounts)]
pub struct CreateUser<'info> {
    #[account()]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + UserAccount::LEN,
        seeds = [b"user", authority.key().as_ref()],
        bump
    )]
    pub user: Account<'info, UserAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddReview<'info> {
    #[account()]
    pub reviewer: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", reviewer.key().as_ref()],
        bump = reviewer_user.bump,
        constraint = reviewer_user.wallet == reviewer.key() @ SafeChainError::InvalidReviewerProfile
    )]
    pub reviewer_user: Account<'info, UserAccount>,

    /// CHECK: target wallet pubkey only, no data is read from this account
    pub target: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = payer,
        space = 8 + UserAccount::LEN,
        seeds = [b"user", target.key().as_ref()],
        bump
    )]
    pub target_user: Account<'info, UserAccount>,

    #[account(
        init,
        payer = payer,
        space = 8 + ReviewAccount::LEN,
        seeds = [b"review", target.key().as_ref(), reviewer.key().as_ref()],
        bump
    )]
    pub review: Account<'info, ReviewAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateScore<'info> {
    #[account(
        mut,
        seeds = [b"user", target_user.wallet.as_ref()],
        bump = target_user.bump
    )]
    pub target_user: Account<'info, UserAccount>,

    #[account(
        mut,
        seeds = [b"review", target_user.wallet.as_ref(), review.reviewer.as_ref()],
        bump = review.bump,
        constraint = review.target == target_user.wallet @ SafeChainError::ReviewTargetMismatch
    )]
    pub review: Account<'info, ReviewAccount>,
}

#[account]
pub struct UserAccount {
    pub wallet: Pubkey,
    pub score: u8,
    pub review_count: u32,
    pub low_rating_count: u32,
    pub flagged: bool,
    pub last_review_ts: i64,
    pub bump: u8,
}

impl UserAccount {
    pub const LEN: usize =
        32 + // wallet
        1 + // score
        4 + // review_count
        4 + // low_rating_count
        1 + // flagged
        8 + // last_review_ts
        1; // bump
}

#[account]
pub struct ReviewAccount {
    pub reviewer: Pubkey,
    pub target: Pubkey,
    pub rating: u8,
    pub comment: String,
    pub timestamp: i64,
    pub applied: bool,
    pub bump: u8,
}

impl ReviewAccount {
    pub const LEN: usize =
        32 + // reviewer
        32 + // target
        1 + // rating
        4 + MAX_COMMENT_LEN + // comment
        8 + // timestamp
        1 + // applied
        1; // bump
}

#[event]
pub struct UserCreated {
    pub wallet: Pubkey,
    pub score: u8,
    pub ts: i64,
}

#[event]
pub struct ReviewAdded {
    pub reviewer: Pubkey,
    pub target: Pubkey,
    pub rating: u8,
    pub ts: i64,
}

#[event]
pub struct ScoreUpdated {
    pub wallet: Pubkey,
    pub score: u8,
    pub review_count: u32,
    pub flagged: bool,
    pub ts: i64,
}

#[error_code]
pub enum SafeChainError {
    #[msg("Rating must be between 1 and 5")]
    InvalidRating,
    #[msg("Comment exceeds max allowed length")]
    CommentTooLong,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Reviewer profile does not match signer")]
    InvalidReviewerProfile,
    #[msg("You cannot review your own wallet")]
    SelfReviewForbidden,
    #[msg("Cooldown period has not passed")]
    CooldownNotPassed,
    #[msg("Review already applied")]
    ReviewAlreadyApplied,
    #[msg("Review target mismatch")]
    ReviewTargetMismatch,
}
