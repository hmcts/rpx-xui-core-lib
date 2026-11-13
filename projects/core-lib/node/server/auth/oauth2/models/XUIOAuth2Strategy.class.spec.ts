import { getUserDetails } from './XUIOAuth2Strategy.class'
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
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- keep this inherited provider fixture shape; contract-specific tests constrain the runtime behavior.
    const get = jest.spyOn(http, 'get').mockResolvedValue({} as any)
    await getUserDetails(jwt, logoutUrl)

    expect(get).toHaveBeenCalledWith(`${logoutUrl}/details`, httpGetOptions)
})
