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
}
