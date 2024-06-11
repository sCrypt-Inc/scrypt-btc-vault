import { expect, use } from 'chai'
import { PubKey, sha256, toByteString } from 'scrypt-ts'
import { VaultLocked } from '../src/contracts/valutLocked'
import { VaultUnvaulted } from '../src/contracts/vaultUnvaulted'
import { getDefaultSigner } from './utils/txHelper'
import chaiAsPromised from 'chai-as-promised'
import { myPublicKey } from './utils/privateKey'
use(chaiAsPromised)

describe('Test SmartContract `Vault`', () => {
    let instance0: VaultLocked
    let instance1: VaultUnvaulted

    before(async () => {
        await VaultLocked.loadArtifact()
        await VaultUnvaulted.loadArtifact()

        instance0 = new VaultLocked(
            PubKey(myPublicKey.toByteString()),
            toByteString('test', true)
        )
        await instance0.connect(getDefaultSigner())

        instance1 = new VaultUnvaulted(
            toByteString('test', true),
            PubKey(myPublicKey.toByteString())
        )
        await instance0.connect(getDefaultSigner())
    })

    it('should pass', async () => {
        console.log(instance0.lockingScript.toASM())
        console.log(instance1.lockingScript.toASM())
    })
})
