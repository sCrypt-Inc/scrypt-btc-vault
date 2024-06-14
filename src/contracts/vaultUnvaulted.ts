import {
    assert,
    ByteString,
    method,
    prop,
    PubKey,
    sha256,
    Sig,
    SmartContract,
} from 'scrypt-ts'
import { SHPreimage, SigHashUtils } from './sigHashUtils'

export class VaultUnvaulted extends SmartContract {
    @prop()
    sequenceVal: ByteString

    @prop()
    withdrawalPubKey: PubKey

    @prop()
    cancelPubKey: PubKey

    @prop()
    vaultCancelP2TROutput: ByteString

    /**
     *
     * @param sequenceVal  - Specifies (relative) time until the vault can be unlocked.
     * @param withdrawalPubKey - Public key, used for withdrawal.
     * @param cancelPubKey - Public key, used for canceling.
     * @param vaultCancelP2TROutput - P2TR to the canceling state contract.
     *
     */
    constructor(
        sequenceVal: ByteString,
        withdrawalPubKey: PubKey,
        cancelPubKey: PubKey,
    ) {
        super(...arguments)
        this.sequenceVal = sequenceVal
        this.withdrawalPubKey = withdrawalPubKey
        this.cancelPubKey = cancelPubKey
        this.vaultCancelP2TROutput = this.vaultCancelP2TROutput
    }

    @method()
    public withdraw(sig: Sig) {
        this.csv(this.sequenceVal)

        // Check sig.
        assert(this.checkSig(sig, this.withdrawalPubKey))
    }
    
    @method()
    public cancel(
        shPreimage: SHPreimage,
        sig: Sig,
        outputsSuffix: ByteString
    ) {
        // Check sig.
        assert(this.checkSig(sig, this.cancelPubKey))

        // Check sighash preimage.
        const s = SigHashUtils.checkSHPreimage(shPreimage)
        assert(this.checkSig(s, SigHashUtils.Gx))

        // Check first output is P2TR to the canceling contract
        const hashOutputs = sha256(
            this.vaultCancelP2TROutput + outputsSuffix
        )
        assert(hashOutputs == shPreimage.hashOutputs, 'hashOutputs mismatch')
    }

    @method()
    private csv(sequenceVal: ByteString): void {
        // ... Gets substituted for OP_CSV w/ inline assembly hook
        // TODO: Rm once OP_CSV is added to compiler.
        assert(true)
    }

    // Default taproot key spend must be disabled!
}
