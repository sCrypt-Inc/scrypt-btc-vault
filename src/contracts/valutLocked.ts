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

export class VaultLocked extends SmartContract {
    @prop()
    vaultPubKey: PubKey

    @prop()
    vaultUnvaultedP2TROutput: ByteString

    /**
     *
     * @param vaultPubKey - Public key, used for withdrawal.
     * @param vaultUnvaultedP2TROutput - P2TR to the unvaulted state contract.
     *
     */
    constructor(vaultPubKey: PubKey, vaultUnvaultedP2TROutput: ByteString) {
        super(...arguments)
        this.vaultPubKey = vaultPubKey
        this.vaultUnvaultedP2TROutput = vaultUnvaultedP2TROutput
    }

    @method()
    public unvault(
        shPreimage: SHPreimage,
        sig: Sig,
        outputsSuffix: ByteString
    ) {
        // Check sig.
        assert(this.checkSig(sig, this.vaultPubKey))

        // Check sighash preimage.
        const s = SigHashUtils.checkSHPreimage(shPreimage)
        assert(this.checkSig(s, SigHashUtils.Gx))

        // Check first output is P2TR to the unvaulted contract
        const hashOutputs = sha256(
            this.vaultUnvaultedP2TROutput + outputsSuffix
        )
        assert(hashOutputs == shPreimage.hashOutputs, 'hashOutputs mismatch')
    }

    // Cancel functionality should be done via default taproot key spend.
}
