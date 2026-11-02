package expo.modules.smsreader

import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.provider.Telephony
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.lang.ref.WeakReference

private const val PREFS = "broke_meter_sms_queue"
private const val KEY = "queue"
private const val MAX_QUEUE = 200

/**
 * Receives incoming SMS. Every message is appended to a small on-device queue (so nothing is lost if the
 * app process is not running) and, if the app is alive, JS is told to drain the queue.
 * Messages never leave the phone.
 */
class SmsReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
    val msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent)
    if (msgs == null || msgs.isEmpty()) return
    val address = msgs[0].originatingAddress ?: ""
    val body = msgs.joinToString("") { it.messageBody ?: "" }
    enqueue(context, address, body, System.currentTimeMillis())
    SmsReaderModule.instance?.get()?.notifyQueued()
  }

  private fun enqueue(context: Context, address: String, body: String, date: Long) {
    synchronized(SmsReceiver::class.java) {
      val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      val arr = try { JSONArray(prefs.getString(KEY, "[]")) } catch (e: Exception) { JSONArray() }
      val item = JSONObject()
      item.put("address", address)
      item.put("body", body)
      item.put("date", date)
      arr.put(item)
      val trimmed = JSONArray()
      val start = if (arr.length() > MAX_QUEUE) arr.length() - MAX_QUEUE else 0
      for (i in start until arr.length()) trimmed.put(arr.get(i))
      prefs.edit().putString(KEY, trimmed.toString()).apply()
    }
  }
}

class SmsReaderModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("SmsReader")
    Events("onSmsQueued")

    OnCreate { instance = WeakReference(this@SmsReaderModule) }
    OnDestroy { instance = null }

    Function("hasPermission") {
      has(Manifest.permission.READ_SMS) && has(Manifest.permission.RECEIVE_SMS)
    }

    // Past inbox messages since a timestamp (ms), newest first.
    AsyncFunction("readInbox") { sinceMs: Double ->
      val out = ArrayList<Map<String, Any>>()
      if (!has(Manifest.permission.READ_SMS)) return@AsyncFunction out
      val cursor = context.contentResolver.query(
        Telephony.Sms.Inbox.CONTENT_URI,
        arrayOf("address", "body", "date"),
        "date >= ?",
        arrayOf(sinceMs.toLong().toString()),
        "date DESC LIMIT 3000"
      )
      cursor?.use {
        val a = it.getColumnIndex("address")
        val b = it.getColumnIndex("body")
        val d = it.getColumnIndex("date")
        while (it.moveToNext()) {
          out.add(mapOf("address" to (it.getString(a) ?: ""), "body" to (it.getString(b) ?: ""), "date" to it.getLong(d).toDouble()))
        }
      }
      out
    }

    // Messages received while JS was not listening. Clears the queue.
    AsyncFunction("drainQueue") {
      val out = ArrayList<Map<String, Any>>()
      synchronized(SmsReceiver::class.java) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val arr = try { JSONArray(prefs.getString(KEY, "[]")) } catch (e: Exception) { JSONArray() }
        for (i in 0 until arr.length()) {
          val o = arr.getJSONObject(i)
          out.add(mapOf("address" to o.optString("address"), "body" to o.optString("body"), "date" to o.optLong("date").toDouble()))
        }
        prefs.edit().putString(KEY, "[]").apply()
      }
      out
    }
  }

  fun notifyQueued() {
    sendEvent("onSmsQueued", mapOf<String, Any>())
  }

  private fun has(permission: String): Boolean =
    ContextCompat.checkSelfPermission(context, permission) == PackageManager.PERMISSION_GRANTED

  companion object {
    @Volatile
    var instance: WeakReference<SmsReaderModule>? = null
  }
}
