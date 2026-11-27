import { OAuth2Metadata } from './OAuth2Metadata.interface'
import OAuth2Strategy from 'passport-oauth2'
import { AxiosResponse } from 'axios'
import { http } from '../../../common/http'

export class XUIOAuth2Strategy extends OAuth2Strategy {
    private readonly options: OAuth2Metadata
    constructor(options: OAuth2Metadata, verify: OAuth2Strategy.VerifyFunction) {
        super(options, verify)
        this.options = options
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- preserve the migrated Node Lib public callback or provider contract until a separately versioned type change.
    userProfile = async (accessToken: string, done: (err?: Error | null, profile?: any) => void): Promise<void> => {
        let userDetails: AxiosResponse
        try {
            userDetails = await getUserDetails(accessToken, this.options.logoutUrl)
        } catch (error) {
            done(error instanceof Error ? error : new Error('Failed to retrieve user profile'))
            return
        }
        done(null, userDetails.data)
    }
}

export const getUserDetails = (jwt: string, logoutUrl: string): Promise<AxiosResponse> => {
    const options = {
        headers: { Authorization: `Bearer ${jwt}` },
        timeout: 15000,
    }
    return http.get(`${logoutUrl}/details`, options)
}
