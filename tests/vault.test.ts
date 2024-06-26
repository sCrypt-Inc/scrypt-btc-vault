// @ts-ignore
import btc = require('bitcore-lib-inquisition');
import axios from 'axios';
import { Tap } from '@cmdcode/tapscript'  // Requires node >= 19
import ecurve = require('ecurve');
import sha256 = require('js-sha256');
import BigInteger = require('bigi')

import dotenv = require('dotenv');
import { PublicKey } from 'scrypt-bitcore-lib';
dotenv.config();

import { expect, use } from 'chai'
import { VaultTriggerWithdrawal } from '../src/contracts/vaultTriggerWithdrawal'
import { VaultCompleteWithdrawal } from '../src/contracts/vaultCompleteWithdrawal'
import { VaultCancelWithdrawal } from '../src/contracts/vaultCancelWithdrawal'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

const curve = ecurve.getCurveByName('secp256k1');

async function fetchP2WPKHUtxos(address: btc.Address): Promise<any[]> {
    const url = `https://explorer.bc-2.jp/api/address/${address.toString()}/utxo`;

    let res = []
    try {
        // Make a GET request to the URL using axios
        const response = await axios.get(url);

        if (response.data) {
            for (let i = 0; i < response.data.length; i++) {
                const e = response.data[i]
                const utxo = {
                    address: address.toString(),
                    txId: e.txid,
                    outputIndex: e.vout,
                    script: new btc.Script(address),
                    satoshis: e.value
                };
                res.push(utxo)
            }
        }
    } catch (error) { // Handle any errors that occurred during the request
        console.error('Failed to fetch data:', error);
    }
    return res
}

function hashSHA256(buff: Buffer | string) {
    return Buffer.from(sha256.sha256.create().update(buff).array());
}

function getSigHashSchnorr(
    transaction: btc.Transaction,
    tapleafHash: Buffer,
    inputIndex = 0,
    sigHashType = 0x00
) {
    //const sighash = btc.Transaction.Sighash.sighash(transaction, sigHashType, inputIndex, subscript);
    const execdata = {
        annexPresent: false,
        annexInit: true,
        tapleafHash: tapleafHash,
        tapleafHashInit: true,
        ////validationWeightLeft: 110,
        ////validationWeightLeftInit: true,
        codeseparatorPos: new btc.crypto.BN(4294967295),
        codeseparatorPosInit: true,
    }
    
    return {
        preimage: btc.Transaction.SighashSchnorr.sighashPreimage(transaction, sigHashType, inputIndex, 3, execdata),
        hash: btc.Transaction.SighashSchnorr.sighash(transaction, sigHashType, inputIndex, 3, execdata)
    }
}


function getE(
    sighash: Buffer
) {
    const Gx = curve.G.affineX.toBuffer(32);

    const tagHash = hashSHA256('BIP0340/challenge')
    const tagHashMsg = Buffer.concat([Gx, Gx, sighash])
    const taggedHash = hashSHA256(Buffer.concat([tagHash, tagHash, tagHashMsg]))

    return BigInteger.fromBuffer(taggedHash).mod(curve.n);
}

function splitSighashPreimage(preimage: Buffer) {
    return {
        tapSighash1: preimage.slice(0, 32),
        tapSighash2: preimage.slice(32, 64),
        epoch: preimage.slice(64, 65),
        sighashType: preimage.slice(65, 66),
        txVersion: preimage.slice(66, 70),
        nLockTime: preimage.slice(70, 74),
        hashPrevouts: preimage.slice(74, 106),
        hashSpentAmounts: preimage.slice(106, 138),
        hashScripts: preimage.slice(138, 170),
        hashSequences: preimage.slice(170, 202),
        hashOutputs: preimage.slice(202, 234),
        spendType: preimage.slice(234, 235),
        inputNumber: preimage.slice(235, 239),
        tapleafHash: preimage.slice(239, 271),
        keyVersion: preimage.slice(271, 272),
        codeseparatorPosition: preimage.slice(272)
    };
}


describe('Test SmartContract `Vault`', () => {

    before(async () => {
        await VaultTriggerWithdrawal.loadArtifact()
        await VaultCompleteWithdrawal.loadArtifact()
        await VaultCancelWithdrawal.loadArtifact()
    })

    it('should pass', async () => {
        const seckey = new btc.PrivateKey(process.env.PRIVATE_KEY, btc.Networks.testnet)
        const pubkey = seckey.toPublicKey()
        const addrP2WPKH = seckey.toAddress(null, btc.Address.PayToWitnessPublicKeyHash)

        const xOnlyPub = pubkey.toBuffer().length > 32 ? pubkey.toBuffer().slice(1, 33) : pubkey.toBuffer()

        const instanceTrigger = new VaultTriggerWithdrawal(
            xOnlyPub.toString('hex')
        )
        const scriptVaultTrigger = instanceTrigger.lockingScript
        const tapleafVaultTrigger = Tap.encodeScript(scriptVaultTrigger.toBuffer())

        const instanceComplete = new VaultCompleteWithdrawal(
            2n  // 2 blocks
        )
        const scriptVaultComplete = instanceComplete.lockingScript
        const tapleafVaultComplete = Tap.encodeScript(scriptVaultComplete.toBuffer())

        const instanceCancel = new VaultCancelWithdrawal(
            xOnlyPub.toString('hex')
        )
        const scriptVaultCancel = instanceCancel.lockingScript
        const tapleafVaultCancel = Tap.encodeScript(scriptVaultCancel.toBuffer())

        const [tpubkeyVault,] = Tap.getPubKey(pubkey.toString(), { tree: [tapleafVaultTrigger, tapleafVaultComplete, tapleafVaultCancel] })
        const scripVaultP2TR = new btc.Script(`OP_1 32 0x${tpubkeyVault}}`)

        const [, cblockVaultTrigger] = Tap.getPubKey(pubkey.toString(),
            {
                target: tapleafVaultTrigger,
                tree: [tapleafVaultTrigger, tapleafVaultComplete, tapleafVaultCancel]
            }
        )
        const [, cblockVaultComplete] = Tap.getPubKey(pubkey.toString(),
            {
                target: tapleafVaultComplete,
                tree: [tapleafVaultTrigger, tapleafVaultComplete, tapleafVaultCancel]
            }
        )
        const [, cblockVaultCancel] = Tap.getPubKey(pubkey.toString(),
            {
                target: tapleafVaultCancel,
                tree: [tapleafVaultTrigger, tapleafVaultComplete, tapleafVaultCancel]
            }
        )

        // Fetch UTXO's for address
        let utxos = await fetchP2WPKHUtxos(addrP2WPKH)
        if (utxos.length === 0){
            throw new Error(`No UTXO's for address: ${addrP2WPKH.toString()}`) 
        }
        console.log(utxos)

        const tx0 = new btc.Transaction()
            .from(utxos)
            .addOutput(new btc.Transaction.Output({
                satoshis: 1000,
                script: scripVaultP2TR
            }))
            .change(addrP2WPKH)
            .feePerByte(2)
            .sign(seckey)
        const vaultAmtBuff = Buffer.alloc(8)
        vaultAmtBuff.writeBigInt64LE(1000n)

        console.log('tx0 (serialized):', tx0.uncheckedSerialize())

        //////// Create fee outputs
        const feeAmtBuff = Buffer.alloc(8)
        feeAmtBuff.writeBigInt64LE(3500n)

        utxos = [
            {
                address: 'tb1q2xedyqdc9x7w4kk2sws3w22m73mtexv7mqjfux',
                txId: tx0.id,
                outputIndex: 1,
                script: new btc.Script(addrP2WPKH),
                satoshis: tx0.outputs[1].satoshis
            }
        ]

        const txFee = new btc.Transaction()
            .from(utxos)
            .to(addrP2WPKH, 3500)
            .to(addrP2WPKH, 3500)
            .change(addrP2WPKH)
            .feePerByte(2)
            .sign(seckey)

        console.log('txFee (serialized):', txFee.uncheckedSerialize())

        //////// CALL - Trigger

        const utxoVaultLockedP2TR = {
            txId: tx0.id,
            outputIndex: 0,
            script: scripVaultP2TR,
            satoshis: tx0.outputs[0].satoshis
        };

        const feeUTXO = {
            address: 'tb1q2xedyqdc9x7w4kk2sws3w22m73mtexv7mqjfux',
            txId: txFee.id,
            outputIndex: 0,
            script: new btc.Script(addrP2WPKH),
            satoshis: txFee.outputs[0].satoshis
        }

        const targetOut = new btc.Transaction.Output({
            satoshis: 546,
            script: new btc.Script(addrP2WPKH),
        })

        const tx1 = new btc.Transaction()
            .from([utxoVaultLockedP2TR, feeUTXO])
            .addOutput(tx0.outputs[0])
            .addOutput(targetOut)

        // Mutate tx1 until e ends with 0x01.
        let e, eBuff, sighash;
        while (true) {
            sighash = getSigHashSchnorr(tx1, Buffer.from(tapleafVaultTrigger, 'hex'), 0)
            e = await getE(sighash.hash)
            eBuff = e.toBuffer(32)
            const eLastByte = eBuff[eBuff.length - 1]
            if (eLastByte == 1) {
                break;
            }
            tx1.nLockTime += 1
        }


        let _e = eBuff.slice(0, eBuff.length - 1) // e' - e without last byte
        let preimageParts = splitSighashPreimage(sighash.preimage)

        let sig = btc.crypto.Schnorr.sign(seckey, sighash.hash);

        // Also sign fee input
        let hashData = btc.crypto.Hash.sha256ripemd160(seckey.publicKey.toBuffer());
        let signatures = tx1.inputs[1].getSignatures(tx1, seckey, 1, undefined, hashData, undefined, undefined)
        tx1.inputs[1].addSignature(tx1, signatures[0])


        let witnesses = [
            preimageParts.txVersion,
            preimageParts.nLockTime,
            preimageParts.hashPrevouts,
            preimageParts.hashSpentAmounts,
            preimageParts.hashScripts,
            preimageParts.hashSequences,
            preimageParts.hashOutputs,
            preimageParts.spendType,
            preimageParts.inputNumber,
            preimageParts.tapleafHash,
            preimageParts.keyVersion,
            preimageParts.codeseparatorPosition,
            sighash.hash,
            _e,
            sig,
            Buffer.concat([Buffer.from('22', 'hex'), scripVaultP2TR.toBuffer()]),
            Buffer.concat([Buffer.from('16', 'hex'), txFee.outputs[0].script.toBuffer()]),
            vaultAmtBuff,
            feeAmtBuff,
            Buffer.concat([Buffer.from('16', 'hex'), targetOut.script.toBuffer()]),
            scriptVaultTrigger.toBuffer(),
            Buffer.from(cblockVaultTrigger, 'hex')
        ]
        tx1.inputs[0].witnesses = witnesses


        console.log('tx1 (serialized):', tx1.uncheckedSerialize())

        // Run locally
        let interpreter = new btc.Script.Interpreter()
        let flags = btc.Script.Interpreter.SCRIPT_VERIFY_WITNESS | btc.Script.Interpreter.SCRIPT_VERIFY_TAPROOT
        let res = interpreter.verify(new btc.Script(''), tx0.outputs[0].script, tx1, 0, flags, witnesses, tx0.outputs[0].satoshis)
        console.log('Local execution success:', res)

        //////////// CALL - Complete
        const utxoVaultTriggeredP2TR = {
            txId: tx1.id,
            outputIndex: 0,
            script: scripVaultP2TR,
            satoshis: tx1.outputs[0].satoshis
        };

        const feeUTXO2 = {
            address: 'tb1q2xedyqdc9x7w4kk2sws3w22m73mtexv7mqjfux',
            txId: txFee.id,
            outputIndex: 1,
            script: new btc.Script(addrP2WPKH),
            satoshis: txFee.outputs[1].satoshis
        }

        const destOut = new btc.Transaction.Output({
            satoshis: tx1.outputs[0].satoshis,
            script: new btc.Script(addrP2WPKH),
        })

        const tx2 = new btc.Transaction()
            .from([utxoVaultTriggeredP2TR, feeUTXO2])
            .addOutput(destOut)

        tx2.inputs[0].lockUntilBlockHeight(2)

        // Mutate tx2 until e ends with 0x01.
        while (true) {
            sighash = getSigHashSchnorr(tx2, Buffer.from(tapleafVaultComplete, 'hex'), 0)
            e = await getE(sighash.hash)
            eBuff = e.toBuffer(32)
            const eLastByte = eBuff[eBuff.length - 1]
            if (eLastByte == 1) {
                break;
            }
            tx2.nLockTime += 1
        }

        _e = eBuff.slice(0, eBuff.length - 1) // e' - e without last byte
        preimageParts = splitSighashPreimage(sighash.preimage)

        sig = btc.crypto.Schnorr.sign(seckey, sighash.hash);

        // Also sign fee input
        hashData = btc.crypto.Hash.sha256ripemd160(seckey.publicKey.toBuffer());
        signatures = tx2.inputs[1].getSignatures(tx2, seckey, 1, undefined, hashData, undefined, undefined)
        tx2.inputs[1].addSignature(tx2, signatures[0])

        const prevTxVer = Buffer.alloc(4)
        prevTxVer.writeUInt32LE(tx1.version)

        const prevTxLocktime = Buffer.alloc(4)
        prevTxLocktime.writeUInt32LE(tx1.nLockTime)

        let prevTxInputContract = new btc.encoding.BufferWriter()
        prevTxInputContract.writeVarintNum(tx1.inputs.length)
        tx1.inputs[0].toBufferWriter(prevTxInputContract);
        let prevTxInputFee = new btc.encoding.BufferWriter()
        tx1.inputs[1].toBufferWriter(prevTxInputFee);

        let feePrevout = new btc.encoding.BufferWriter()
        feePrevout.writeReverse(tx2.inputs[1].prevTxId);
        feePrevout.writeInt32LE(tx2.inputs[1].outputIndex);

        witnesses = [
            preimageParts.txVersion,
            preimageParts.nLockTime,
            preimageParts.hashPrevouts,
            preimageParts.hashSpentAmounts,
            preimageParts.hashScripts,
            preimageParts.hashSequences,
            preimageParts.hashOutputs,
            preimageParts.spendType,
            preimageParts.inputNumber,
            preimageParts.tapleafHash,
            preimageParts.keyVersion,
            preimageParts.codeseparatorPosition,
            sighash.hash,
            _e,
            prevTxVer,
            prevTxLocktime,
            prevTxInputContract.toBuffer(),
            prevTxInputFee.toBuffer(),
            Buffer.concat([Buffer.from('22', 'hex'), scripVaultP2TR.toBuffer()]),
            vaultAmtBuff,
            Buffer.concat([Buffer.from('16', 'hex'), targetOut.script.toBuffer()]),
            feePrevout.toBuffer(),
            scriptVaultComplete.toBuffer(),
            Buffer.from(cblockVaultComplete, 'hex')
        ]
        tx2.inputs[0].witnesses = witnesses

        console.log('tx2 (serialized):', tx2.uncheckedSerialize())

        // Run locally
        interpreter = new btc.Script.Interpreter()
        flags = btc.Script.Interpreter.SCRIPT_VERIFY_WITNESS | btc.Script.Interpreter.SCRIPT_VERIFY_TAPROOT
        res = interpreter.verify(new btc.Script(''), tx1.outputs[0].script, tx2, 0, flags, witnesses, tx1.outputs[0].satoshis)
        console.log('Local execution success:', res)


    })
})
