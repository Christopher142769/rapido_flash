package bj.rapido.mobile;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/**
 * Canaux Android 8+ : doivent exister pour que les notifications FCM avec channelId
 * (ex. rapido_alerts, orders-high) s’affichent correctement.
 */
public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager nm = getSystemService(NotificationManager.class);
      if (nm == null) return;

      NotificationChannel orders = new NotificationChannel(
        "orders-high",
        "Commandes Rapido",
        NotificationManager.IMPORTANCE_HIGH
      );
      orders.setDescription("Alertes commandes et messages");

      NotificationChannel rapidoAlerts = new NotificationChannel(
        "rapido_alerts",
        "Alertes Rapido",
        NotificationManager.IMPORTANCE_HIGH
      );
      rapidoAlerts.setDescription("Notifications push Rapido (statut commande, paiement)");

      nm.createNotificationChannel(orders);
      nm.createNotificationChannel(rapidoAlerts);
    }
  }
}
