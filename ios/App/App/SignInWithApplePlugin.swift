import Foundation
import Capacitor
import AuthenticationServices

@objc(SignInWithApple)
public class SignInWithApplePlugin: CAPPlugin,
    ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding {

    private var pendingCall: CAPPluginCall?

    @objc func authorize(_ call: CAPPluginCall) {
        pendingCall = call

        DispatchQueue.main.async {
            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.fullName, .email]

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            controller.performRequests()
        }
    }

    public func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return bridge?.viewController?.view.window ?? UIWindow()
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        guard let call = pendingCall else { return }
        pendingCall = nil

        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
            call.reject("Unexpected credential type")
            return
        }

        let identityToken = credential.identityToken.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        let authCode = credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) } ?? ""

        call.resolve([
            "response": [
                "user": credential.user,
                "email": credential.email ?? "",
                "givenName": credential.fullName?.givenName ?? "",
                "familyName": credential.fullName?.familyName ?? "",
                "identityToken": identityToken,
                "authorizationCode": authCode
            ]
        ])
    }

    public func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithError error: Error
    ) {
        guard let call = pendingCall else { return }
        pendingCall = nil
        call.reject(error.localizedDescription)
    }
}
