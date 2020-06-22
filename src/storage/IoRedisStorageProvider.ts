import { IStorageProvider } from "./IStorageProvider";
import { IFilterInfo } from "../IFilter";
import { IAppserviceStorageProvider } from "./IAppserviceStorageProvider";
import * as sha512 from "hash.js/lib/hash/sha/512";
import Redis from 'ioredis'

/**
 * A storage provider that uses redis to store information.
 * @category Storage providers
 */
export class IoRedisStorageProvider implements IStorageProvider, IAppserviceStorageProvider {

    private completedTransactions = [];

    /**
     * Creates a new simple file system storage provider.
     * @param {any} client The ioredis client.
     * @param {boolean} trackTransactionsInMemory True (default) to track all received appservice transactions rather than on disk.
     * @param {int} maxInMemoryTransactions The maximum number of transactions to hold in memory before rotating the oldest out. Defaults to 20.
     */
    constructor(private client: Redis.Redis, private trackTransactionsInMemory = true, private maxInMemoryTransactions = 20, private redisHasKey = 'matrixJsBotSdk') {
    }

    setSyncToken(token: string | null): Promise<Redis.BooleanResponse> {
        return this.client.hset(this.redisHasKey, 'syncToken', token)
    }

    getSyncToken(): Promise<string> {
        return this.client.hget(this.redisHasKey, 'syncToken')
    }

    setFilter(filter: IFilterInfo): Promise<Redis.BooleanResponse> {
        return this.client.hset(this.redisHasKey, 'filter', filter)
    }

    getFilter(): IFilterInfo {
        return this.client.hget(this.redisHasKey, 'filter')
    }

    addRegisteredUser(userId: string) {
        const key = sha512().update(userId).digest('hex');
        return this.client.hmset(this.redisHasKey,
            `appserviceUsers.${key}.userId`, userId,
            `appserviceUsers.${key}.registered`, true
        )
    }

    isUserRegistered(userId: string): boolean {
        const key = sha512().update(userId).digest('hex');
        return this.client.hget(this.redisHasKey, `appserviceUsers.${key}.registered`)
    }

    isTransactionCompleted(transactionId: string): boolean {
        if (this.trackTransactionsInMemory) {
            return this.completedTransactions.indexOf(transactionId) !== -1;
        }

        const key = sha512().update(transactionId).digest('hex');
        return this.client.hget(this.redisHasKey, `appserviceTransactions.${key}.completed`)
    }

    setTransactionCompleted(transactionId: string) {
        if (this.trackTransactionsInMemory) {
            if (this.completedTransactions.indexOf(transactionId) === -1) {
                this.completedTransactions.push(transactionId);
            }
            if (this.completedTransactions.length > this.maxInMemoryTransactions) {
                this.completedTransactions = this.completedTransactions.reverse().slice(0, this.maxInMemoryTransactions).reverse();
            }
            return;
        }

        const key = sha512().update(transactionId).digest('hex');
        return this.client.hmset(this.redisHasKey,
            `appserviceTransactions.${key}.txnId`, transactionId,
            `appserviceTransactions.${key}.completed`, true
        )
    }

     async getKeyValueStore(): Promise<any> {
         return await this.client.hget(this.redisHasKey, 'kvStore') || {}
     }

    async readValue(key: string): Promise<string | null> {
        return await this.getKeyValueStore()[key]
    }

    async storeValue(key: string, value: string): Promise<Redis.BooleanResponse> {
        const kvStore = await this.getKeyValueStore()
        kvStore[key] = value;
        return this.client.hset(this.redisHasKey, 'kvStore', kvStore)
    }
}
