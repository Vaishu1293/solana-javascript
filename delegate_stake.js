const { 
    Connection, 
    clusterApiUrl,
    LAMPORTS_PER_SOL,
    Keypair,
    StakeProgram,
    Authorized,
    Lockup,
    sendAndConfirmTransaction,
    PublicKey
} = require("@solana/web3.js");

const main = async () => {
    const connection = new Connection(clusterApiUrl("devnet") , "processed");
    const version = await connection.getVersion();
    console.log("Solana Version:", version);
    const wallet = Keypair.generate();
    const airdropSignature = await connection.requestAirdrop(
        wallet.publicKey,
        1 * LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(balance);

    const stakeAccount = Keypair.generate();
    const minimumRent = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
    const amountUserWantsToStake = 0.5 * LAMPORTS_PER_SOL;
    const amountToStake = minimumRent + amountUserWantsToStake;
    const createStakeAccountTx = StakeProgram.createAccount({
        authorized: new Authorized(wallet.publicKey, wallet.publicKey),
        fromPubkey: wallet.publicKey,
        lamports: amountToStake,
        lockup: new Lockup(0, 0, wallet.publicKey),
        stakePubkey: stakeAccount.publicKey
    });
    const createStakeAccountTxId = await sendAndConfirmTransaction(connection, createStakeAccountTx, wallet, stakeAccount);
    console.log(`Stake account created Tx Id: ${createStakeAccountTxId}`);

    let stakeBalance = await connection.getBalance(stakeAccount.publicKey);
    console.log(`Stake account balance: ${stakeBalance / LAMPORTS_PER_SOL} SOL`);

    const validators = await connection.getVoteAccounts();
    const selectedValidators = validators.current[0];
    const selectedValidatorPubKey = new PublicKey(selectedValidators.votePubkey);
    const delegateTx = StakeProgram.delegate({
        stakePubkey: stakeAccount.publicKey,
        authorizedPubkey: wallet.publicKey,
        votePubkey: selectedValidatorPubKey
    });

    const delegateTxId = await sendAndConfirmTransaction(connection, delegateTx, [wallet]);
    console.log(`Stake account delegated to ${selectedValidatorPubKey} Tx Id: ${delegateTxId}`);

    let stakeStatus = await connection.getStakeActivation(
        stakeAccount.publicKey
    );
    console.log(`State account status: ${stakeStatus.state}`);
}

const runMain = async () => {
    try{
        await main();
    } catch (error) {
        console.error(error);
    }
}

runMain();