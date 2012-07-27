#pragma strict

static var guiID : int = 5;

var inset : Rect;
var pauseTime : float;

private var endTime : float;

function OnGUI()
{
   var e : Event = Event.current;
   var sc : Vector2 = Vector2(Screen.width, Screen.height);
   var dialogRect : Rect = Rect(sc.x*inset.x, sc.y*inset.y, sc.x*inset.width, sc.y*inset.height);
   var timeLeft : float = endTime - Time.time;
   //var minutes : float = Mathf.Floor(Game.control.roundTimeRemaining/60.0);
   //var seconds : float = Mathf.Floor(Game.control.roundTimeRemaining%60.0);
   //var timeString : String = minutes.ToString("#0")+":"+seconds.ToString("#00");

   if (timeLeft <= 0.0)
   {
      timeLeft = 0.0;
      endTime = 0.0;
      //restart round
   }


   GUI.Box(dialogRect, "GAME OVER");

   GUILayout.BeginArea(dialogRect);

      GUILayout.Space(sc.y*0.075);

      GUILayout.BeginHorizontal();
         GUILayout.BeginVertical();
            GUILayout.Label("Units survived: x");
            GUILayout.Label("Units killed: x");
            GUILayout.Label("Towers built: x");
            GUILayout.Label("  Directs built: x");
            GUILayout.Label("  AOEs built: x");
            GUILayout.Label("Total damage: x");
            GUILayout.Label("Highest tower DPS: x");
         GUILayout.EndVertical();
   
         GUILayout.BeginVertical();
            GUILayout.Label("Units built: x");
            GUILayout.Label("  Points built:   x");
            GUILayout.Label("  Healer built:   x");
            GUILayout.Label("  Tanks built:    x");
            GUILayout.Label("  Stunners built: x");
            GUILayout.Label("  Most used color: x");
         GUILayout.EndVertical();
      GUILayout.EndHorizontal();

      GUILayout.Space(sc.y*0.075);

      GUILayout.BeginHorizontal();
         GUILayout.BeginVertical();
            GUILayout.Label("  Waiting for others...");
            GUILayout.Label("  Next round will begin in "+timeLeft.ToString("#0")+" seconds");
   
            if (GUILayout.Button(GUIContent("Ready", "ReadyButton"), GUILayout.Height(sc.y*0.075), GUILayout.Width(sc.x*0.1)))
            {
               PressReady();
            }
         GUILayout.EndVertical();
      GUILayout.EndHorizontal();

   GUILayout.EndArea();

   if (e.isKey && e.type == EventType.KeyDown)
   {

      switch (e.keyCode)
      {
         case KeyCode.Escape:
            GUIControl.SwitchGUI(4);
         break;
      }

   }
}

function PressReady()
{
   if (Network.isClient)
      Game.control.netView.RPC("ToServerReadyToStartRound", RPCMode.Server);
   else
   {
      Game.control.InitRound(false);
      Game.player.isReadyToStartRound = true;
   }
}

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
}

function OnEnable()
{
   if (endTime != 0.0)
      endTime = Time.time + pauseTime;
}
