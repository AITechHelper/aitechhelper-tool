#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SignInWithApple, "SignInWithApple",
    CAP_PLUGIN_METHOD(authorize, CAPPluginReturnPromise);
)
