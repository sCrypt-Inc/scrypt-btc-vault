import { expect, use } from 'chai'
import { PubKey, sha256, toByteString } from 'scrypt-ts'
import { VaultTriggerWithdrawal } from '../src/contracts/valutTriggerWithdrawal'
import { VaultCompleteWithdrawal } from '../src/contracts/vaultCompleteWithdrawal'
import { VaultCancelWithdrawal } from '../src/contracts/vaultCancelWithdrawal'
import { getDefaultSigner } from './utils/txHelper'
import chaiAsPromised from 'chai-as-promised'
import { myPublicKey } from './utils/privateKey'
use(chaiAsPromised)

describe('Test SmartContract `Vault`', () => {
    let instance0: VaultTriggerWithdrawal
    let instance1: VaultCompleteWithdrawal
    let instance2: VaultCancelWithdrawal

    before(async () => {
        await VaultTriggerWithdrawal.loadArtifact()
        await VaultCompleteWithdrawal.loadArtifact()
        await VaultCancelWithdrawal.loadArtifact()
    })

    it('should pass', async () => {

    })
})
