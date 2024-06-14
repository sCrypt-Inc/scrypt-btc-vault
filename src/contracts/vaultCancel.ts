import {
    assert,
    ByteString,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
    toByteString,
} from 'scrypt-ts'
import { SHPreimage, SigHashUtils } from './sigHashUtils'

export class VaultCancel extends SmartContract {
    @prop()
    sequenceVal: ByteString

    @prop()
    cancelPubKey: PubKey

    /**
     *
     * @param sequenceVal  - Specifies (relative) time until the vault can be unlocked.
     * @param cancelPubKey - Public key, used for canceling.
     *
     */
    constructor(
        sequenceVal: ByteString,
        cancelPubKey: PubKey,
    ) {
        super(...arguments)
        this.sequenceVal = sequenceVal
        this.cancelPubKey = cancelPubKey
    }

    @method()
    public complete(sig: Sig) {
        this.csv(this.sequenceVal)

        // Check sig.
        assert(this.checkSig(sig, this.cancelPubKey))
    }
    
    @method()
    public burn(
        shPreimage: SHPreimage,
        sig: Sig
    ) {
        // Check sig.
        assert(this.checkSig(sig, this.cancelPubKey))

        // Check sighash preimage.
        const s = SigHashUtils.checkSHPreimage(shPreimage)
        assert(this.checkSig(s, SigHashUtils.Gx))

        // Burn funds
        // sha256(22020000000000001976a914759d6677091e973b9e9d99f19c68fbf43e3f05f988ac)
        const hashOutputs = toByteString('8d4f1a996bba82ca746d12c53f5f0bbbb993214258fc734e6eb97cd9b67eaaab')
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
