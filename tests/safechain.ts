import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { expect } from "chai";

describe("safechain", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Safechain as Program;
  const userA = anchor.web3.Keypair.generate();
  const userB = anchor.web3.Keypair.generate();

  const airdrop = async (pubkey: anchor.web3.PublicKey) => {
    const sig = await provider.connection.requestAirdrop(pubkey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig, "confirmed");
  };

  const userPda = (wallet: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("user"), wallet.toBuffer()],
      program.programId
    );

  const reviewPda = (target: anchor.web3.PublicKey, reviewer: anchor.web3.PublicKey) =>
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("review"), target.toBuffer(), reviewer.toBuffer()],
      program.programId
    );

  it("creates reviewer and reviews target without pre-created profile", async () => {
    await airdrop(userA.publicKey);
    await airdrop(userB.publicKey);

    const [userAPda] = userPda(userA.publicKey);
    const [userBPda] = userPda(userB.publicKey);

    await program.methods
      .createUser()
      .accounts({
        authority: userA.publicKey,
        user: userAPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userA])
      .rpc();

    await program.methods
      .createUser()
      .accounts({
        authority: userB.publicKey,
        user: userBPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userB])
      .rpc();

    const userC = anchor.web3.Keypair.generate();
    const [userCPda] = userPda(userC.publicKey);

    const [review] = reviewPda(userC.publicKey, userA.publicKey);

    await program.methods
      .addReview(2, "Suspicious behavior")
      .accounts({
        reviewer: userA.publicKey,
        reviewerUser: userAPda,
        target: userC.publicKey,
        targetUser: userCPda,
        review,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([userA])
      .rpc();

    const target = await program.account.userAccount.fetch(userCPda);
    const savedReview = await program.account.reviewAccount.fetch(review);

    expect(target.reviewCount.toNumber()).to.equal(1);
    expect(target.score).to.be.lessThan(50);
    expect(savedReview.rating).to.equal(2);
    expect(savedReview.applied).to.equal(true);
  });
});
