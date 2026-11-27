import { getUserDetails, XUIOAuth2Strategy } from './XUIOAuth2Strategy.class'
import { http } from '../../../common/http'

/*test('getUserDetails() should return a promise', () => {
    const jwt = 'jwtString'
    const logoutUrl = 'http://logout.url'

    expect(getUserDetails(jwt, logoutUrl)).toBeInstanceOf(Promise)
})*/

test('getUserDetails() should call http.get', async () => {
    const jwt = 'jwtString'
    const logoutUrl = 'http://logout.url'
    const httpGetOptions = {
        headers: {
            Authorization: `Bearer ${jwt}`,
        },
        timeout: 15000,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const get = jest.spyOn(http, 'get').mockResolvedValue({} as any)
    await getUserDetails(jwt, logoutUrl)

    expect(get).toHaveBeenCalledWith(`${logoutUrl}/details`, httpGetOptions)
})

test('userProfile passes /details failures to Passport once', async () => {
    const error = new Error('details service unavailable')
    jest.spyOn(http, 'get').mockRejectedValue(error)
    const strategy = new XUIOAuth2Strategy(
        {
            authorizationURL: 'https://identity.test/authorize',
            tokenURL: 'https://identity.test/token',
            clientID: 'client-id',
            clientSecret: 'client-secret',
            callbackURL: 'https://app.test/callback',
            logoutUrl: 'https://identity.test',
        },
        jest.fn(),
    )
    const done = jest.fn()

    await strategy.userProfile('access-token', done)

    expect(done).toHaveBeenCalledTimes(1)
    expect(done).toHaveBeenCalledWith(error)
})
