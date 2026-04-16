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

}
