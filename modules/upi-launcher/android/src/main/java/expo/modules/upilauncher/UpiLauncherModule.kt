package expo.modules.upilauncher

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Opens UPI apps with a plain startActivity (like tapping a upi:// link), targeting a specific package when asked.
 * Nothing is sent anywhere; the app only hands the payment details to the UPI app on this phone.
 */
class UpiLauncherModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("UpiLauncher")

    Function("getUpiApps") { uri: String ->
      val pm = context.packageManager
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
      val infos = if (Build.VERSION.SDK_INT >= 33) {
        pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
      } else {
        @Suppress("DEPRECATION")
        pm.queryIntentActivities(intent, 0)
      }
      val seen = HashSet<String>()
      val out = ArrayList<Map<String, String>>()
      for (ri in infos) {
        val pkg = ri.activityInfo?.packageName ?: continue
        if (pkg == context.packageName || !seen.add(pkg)) continue
        out.add(mapOf("packageName" to pkg, "label" to ri.loadLabel(pm).toString()))
      }
      out
    }

    Function("launch") { uri: String, pkg: String? ->
      try {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))
        val toStart = if (pkg != null) {
          intent.setPackage(pkg)
          intent
        } else {
          Intent.createChooser(intent, "Pay with")
        }
        appContext.throwingActivity.startActivity(toStart)
        true
      } catch (e: Exception) {
        false
      }
    }

    Function("openApp") { pkg: String ->
      try {
        val intent = context.packageManager.getLaunchIntentForPackage(pkg)
        if (intent == null) {
          false
        } else {
          appContext.throwingActivity.startActivity(intent)
          true
        }
      } catch (e: Exception) {
        false
      }
    }
  }
}
