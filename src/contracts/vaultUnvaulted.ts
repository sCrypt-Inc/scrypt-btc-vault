import {
    assert,
    ByteString,
    method,
    prop,
    PubKey,
    Sig,
    SmartContract,
} from 'scrypt-ts'

export class VaultUnvaulted extends SmartContract {
    @prop()
    sequenceVal: ByteString

    @prop()
    vaultPubKey: PubKey

    /**
     *
     * @param sequenceVal  - Specifies (relative) time until the vault can be unlocked.
     * @param vaultPubKey - Public key, used for withdrawal.
     *
     */
    constructor(sequenceVal: ByteString, vaultPubKey: PubKey) {
        super(...arguments)
        this.sequenceVal = sequenceVal
        this.vaultPubKey = vaultPubKey
    }

    @method()
    public withdraw(sig: Sig) {
        this.csv(this.sequenceVal)

        // Check sig.
        assert(this.checkSig(sig, this.vaultPubKey))
    }

    @method()
    private csv(sequenceVal: ByteString): void {
        // ... Gets substituted for OP_CSV w/ inline assembly hook
        // TODO: Rm once OP_CSV is added to compiler.
        assert(true)
    }

    // Cancel functionality should be done via default taproot key spend
}
