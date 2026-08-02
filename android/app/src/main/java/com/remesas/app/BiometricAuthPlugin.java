package com.remesas.app;

import android.os.Handler;
import android.os.Looper;

import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.concurrent.Executor;

// Plugin nativo de biometría (huella / rostro) para el desbloqueo local del
// APK. Usa androidx.biometric.BiometricPrompt, que abre el diálogo REAL del
// sistema y verifica al usuario contra las huellas/rostros registrados en el
// teléfono. A diferencia de WebAuthn (que el WebView de Android no puentea bien
// hacia la huella nativa), esto funciona de verdad dentro de la app.
//
// Es solo verificación LOCAL: confirma que quien abre la app es el dueño del
// teléfono, igual que el PIN. No firma nada contra un servidor.
@CapacitorPlugin(name = "BiometricAuth")
public class BiometricAuthPlugin extends Plugin {

    private static final int AUTHENTICATORS =
            BiometricManager.Authenticators.BIOMETRIC_STRONG
                    | BiometricManager.Authenticators.BIOMETRIC_WEAK;

    // ¿El teléfono tiene biometría configurada y utilizable?
    @PluginMethod
    public void isAvailable(PluginCall call) {
        BiometricManager manager = BiometricManager.from(getContext());
        int result = manager.canAuthenticate(AUTHENTICATORS);
        JSObject ret = new JSObject();
        ret.put("available", result == BiometricManager.BIOMETRIC_SUCCESS);
        ret.put("code", result);
        ret.put("reason", reasonFor(result));
        call.resolve(ret);
    }

    // Lanza el diálogo del sistema y resuelve solo si el usuario se verifica.
    @PluginMethod
    public void verify(final PluginCall call) {
        final FragmentActivity activity = (FragmentActivity) getActivity();
        if (activity == null) {
            call.reject("no_activity");
            return;
        }

        final String title = call.getString("title", "Verifica tu identidad");
        final String subtitle = call.getString("subtitle", "");
        final String cancelTitle = call.getString("cancelTitle", "Usar PIN");

        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                Executor executor = ContextCompat.getMainExecutor(getContext());
                BiometricPrompt prompt = new BiometricPrompt(
                        activity,
                        executor,
                        new BiometricPrompt.AuthenticationCallback() {
                            @Override
                            public void onAuthenticationSucceeded(
                                    BiometricPrompt.AuthenticationResult authResult) {
                                JSObject ret = new JSObject();
                                ret.put("verified", true);
                                call.resolve(ret);
                            }

                            @Override
                            public void onAuthenticationError(
                                    int errorCode, CharSequence errString) {
                                // Cancelado por el usuario o error del sistema:
                                // el JS lo trata como "no verificado" y cae al PIN.
                                call.reject(
                                        errString != null ? errString.toString() : "error",
                                        String.valueOf(errorCode));
                            }

                            @Override
                            public void onAuthenticationFailed() {
                                // Huella/rostro no reconocidos: el sistema deja
                                // reintentar, así que aquí no resolvemos nada.
                            }
                        });

                BiometricPrompt.PromptInfo.Builder builder =
                        new BiometricPrompt.PromptInfo.Builder()
                                .setTitle(title)
                                .setAllowedAuthenticators(AUTHENTICATORS)
                                .setNegativeButtonText(cancelTitle);
                if (subtitle != null && !subtitle.isEmpty()) {
                    builder.setSubtitle(subtitle);
                }

                try {
                    prompt.authenticate(builder.build());
                } catch (Exception e) {
                    call.reject(e.getMessage() != null ? e.getMessage() : "error");
                }
            }
        });
    }

    private String reasonFor(int code) {
        switch (code) {
            case BiometricManager.BIOMETRIC_SUCCESS:
                return "success";
            case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                return "no_hardware";
            case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                return "hw_unavailable";
            case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                return "none_enrolled";
            default:
                return "unavailable";
        }
    }
}
