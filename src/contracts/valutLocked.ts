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
    withdrawalPubKey: PubKey

    @prop()
    vaultUnvaultedP2TROutput: ByteString

    /**
     *
     * @param withdrawalPubKey - Public key, used for withdrawal.
     * @param cancelPubKey - Public key, used for canceling.
     * @param vaultUnvaultedP2TROutput - P2TR to the unvaulted state contract.
     *
     */
    constructor(
        withdrawalPubKey: PubKey,
        vaultUnvaultedP2TROutput: ByteString
    ) {
        super(...arguments)
        this.withdrawalPubKey = withdrawalPubKey
        this.vaultUnvaultedP2TROutput = vaultUnvaultedP2TROutput
    }

    @method()
    public unvault(
        shPreimage: SHPreimage,
        sig: Sig,
        outputsSuffix: ByteString
    ) {
        // Check sig.
        assert(this.checkSig(sig, this.withdrawalPubKey))

        // Check sighash preimage.
        const s = SigHashUtils.checkSHPreimage(shPreimage)
        assert(this.checkSig(s, SigHashUtils.Gx))

        // Check first output is P2TR to the unvaulted contract
        const hashOutputs = sha256(
            this.vaultUnvaultedP2TROutput + outputsSuffix
        )
        assert(hashOutputs == shPreimage.hashOutputs, 'hashOutputs mismatch')
    }

    // Default taproot key spend must be disabled!
}
