import {
    assert,
    ByteString,
    hash256,
    method,
    prop,
    sha256,
    SmartContract,
    toByteString,
} from 'scrypt-ts'
import { SHPreimage, SigHashUtils } from './sigHashUtils'


export class VaultCompleteWithdrawal extends SmartContract {

    @prop()
    sequenceVal: ByteString

    /**
     *
     * @param sequenceVal - Relative locktime of withdrawal period.
     *
     */
    constructor(
        sequenceVal: ByteString
    ) {
        super(...arguments)
        this.sequenceVal = sequenceVal
    }

    @method()
    public complete(
        shPreimage: SHPreimage,
        prevTxVer: ByteString,
        prevTxLocktime: ByteString,
        prevTxInputs: ByteString, // Includes input length prefix...
        vaultSPK: ByteString,
        vaultAmt: ByteString,
        targetSPK: ByteString,
        feePrevout: ByteString
    ) {
        this.csv(this.sequenceVal)

        // Check sighash preimage.
        const s = SigHashUtils.checkSHPreimage(shPreimage)
        assert(this.checkSig(s, SigHashUtils.Gx))

        // Construct prev tx.
        const dust = toByteString('2202000000000000')
        const prevTxId = hash256(
            prevTxVer +
            prevTxInputs +
            toByteString('02') + vaultAmt + vaultSPK + dust + targetSPK +
            prevTxLocktime
        )

        // Enforce prevouts.
        const hashPrevouts = sha256(
            prevTxId + toByteString('00000000') +
            feePrevout
        )
        assert(hashPrevouts == shPreimage.hashPrevouts, 'hashPrevouts mismatch')

        // Enforce outputs
        const hashOutputs = sha256(
            vaultAmt + targetSPK
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
