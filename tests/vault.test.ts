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
            PubKey(toByteString('0303ebb776f4248900e13161c26b1539b9a9187f782d98c8252b5d38099a370270')),
            toByteString('70170000000000002251203205240b9592310f4dfa1205d102db9f9a770de546aa9050f9c0ce3f7cfdc6fc')
        )
        await instance0.connect(getDefaultSigner())

        instance1 = new VaultUnvaulted(
            toByteString('14000000'),
            PubKey(toByteString('0303ebb776f4248900e13161c26b1539b9a9187f782d98c8252b5d38099a370270'))
        )
        await instance0.connect(getDefaultSigner())
    })

    it('should pass', async () => {
        console.log(instance0.lockingScript.toASM())
        console.log(instance1.lockingScript.toASM())
    })
})
