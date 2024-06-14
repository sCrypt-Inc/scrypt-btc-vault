import {
    assert,
    ByteString,
    method,
    prop,
    PubKey,
    sha256,
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

        // Pay all to miners.
        const hashOutputs = sha256(toByteString('0000000000000000016a'))
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
