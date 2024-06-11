import {
    ByteString,
    PubKey,
    Sig,
    SmartContractLib,
    assert,
    method,
    prop,
    sha256,
    toByteString,
} from 'scrypt-ts'

const TAG_HASH =
    'f40a48df4b2a70c8b4924bf2654661ed3d95fd66a313eb87237597c628e4a031' // sha256("BIP0340/challenge")
const Gx = '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
const PREIMAGE_SIGHASH = '00' // SIGHASH_ALL
const PREIMAGE_EPOCH = '00'

export type SHPreimage = {
    txVer: ByteString
    nLockTime: ByteString
    hashPrevouts: ByteString
    hashSpentAmounts: ByteString
    hashSpentScripts: ByteString
    hashSequences: ByteString
    hashOutputs: ByteString
    spendType: ByteString
    inputNumber: ByteString
    hashTapLeaf: ByteString
    keyVer: ByteString
    codeSeparator: ByteString

    sigHash: ByteString
    _e: ByteString // e without last byte
}

export class SigHashUtils extends SmartContractLib {
    // Data for checking sighash preimage:
    @prop()
    static readonly Gx: PubKey = PubKey(
        toByteString(
            '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
        )
    )
    @prop()
    static readonly ePreimagePrefix: ByteString = toByteString(
        'f40a48df4b2a70c8b4924bf2654661ed3d95fd66a313eb87237597c628e4a031f40a48df4b2a70c8b4924bf2654661ed3d95fd66a313eb87237597c628e4a03179be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f8179879be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
    ) // TAG_HASH + TAG_HASH + Gx + Gx
    @prop()
    static readonly preimagePrefix: ByteString = toByteString(
        'f40a48df4b2a70c8b4924bf2654661ed3d95fd66a313eb87237597c628e4a031f40a48df4b2a70c8b4924bf2654661ed3d95fd66a313eb87237597c628e4a0310000'
    ) // TAG_HASH + TAG_HASH + PREIMAGE_SIGHASH + PREIMAGE_EPOCH

    @method()
    static checkSHPreimage(shPreimage: SHPreimage): Sig {
        const e = sha256(SigHashUtils.ePreimagePrefix + shPreimage.sigHash)
        assert(e == shPreimage._e + toByteString('01'), 'invalid value of _e')
        const s = SigHashUtils.Gx + shPreimage._e + toByteString('02')
        const sigHash = sha256(
            shPreimage.txVer +
                shPreimage.nLockTime +
                shPreimage.hashPrevouts +
                shPreimage.hashSpentAmounts +
                shPreimage.hashSpentScripts +
                shPreimage.hashSequences +
                shPreimage.hashOutputs +
                shPreimage.spendType +
                shPreimage.inputNumber +
                shPreimage.hashTapLeaf +
                shPreimage.keyVer +
                shPreimage.codeSeparator
        )
        assert(sigHash == shPreimage.sigHash, 'sigHash mismatch')

        //assert(this.checkSig(Sig(s), SigHashUtils.Gx)) TODO (currently done outside)
        return Sig(s)
    }
}
