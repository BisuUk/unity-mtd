#pragma strict

static var guiID : int = 5;

var inset : Rect;
var pauseTime : float;
var showRoundNum : int;

private var endTime : float;
private var sc : Vector2;
private var dialogRect : Rect;

function OnGUI()
{
   var e : Event = Event.current;
   var timeLeft : float = endTime - Time.time;

   sc = Vector2(Screen.width, Screen.height);
   dialogRect = Rect(sc.x*inset.x, sc.y*inset.y, sc.x*inset.width, sc.y*inset.height);

   //var minutes : float = Mathf.Floor(Game.control.roundTimeRemaining/60.0);
   //var seconds : float = Mathf.Floor(Game.control.roundTimeRemaining%60.0);
   //var timeString : String = minutes.ToString("#0")+":"+seconds.ToString("#00");

   if (timeLeft <= 0.0)
   {
      timeLeft = 0.0;
      endTime = 0.0;
      //restart round
   }

   if (Game.control.matchInProgress)
      GUI.Box(dialogRect, "ROUND OVER");
   else
      GUI.Box(dialogRect, "MATCH OVER");

   GUILayout.BeginArea(dialogRect);

      GUILayout.Space(sc.y*0.075);

      if (showRoundNum > 0)
      {
         DrawRoundGUI();
      }

      GUILayout.Space(sc.y*0.075);

      GUILayout.BeginHorizontal();
         GUILayout.BeginVertical();
            if (GUILayout.Button(GUIContent("1", "Round"), GUILayout.Height(sc.y*0.075), GUILayout.Width(sc.x*0.1)))
            {
               PressRoundNum(1);
            }
         GUILayout.EndVertical();
      GUILayout.EndHorizontal();

      if (Game.control.matchInProgress)
      {
         GUILayout.BeginHorizontal();
            GUILayout.BeginVertical();
               GUILayout.Label("  Waiting for others...");
               GUILayout.Label("  Next round will begin in "+timeLeft.ToString("#0")+" seconds");
               if (GUILayout.Button(GUIContent("Ready", "ReadyButton"), GUILayout.Height(sc.y*0.075), GUILayout.Width(sc.x*0.1)))
                  PressReady();
            GUILayout.EndVertical();
         GUILayout.EndHorizontal();
      }
      else
      {
         GUILayout.BeginHorizontal();
            GUILayout.BeginVertical();
               if ((Game.hostType > 0) && GUILayout.Button(GUIContent("Return to lobby", "ReturnToLobby"), GUILayout.Height(sc.y*0.075), GUILayout.Width(sc.x*0.1)))
                  PressReturnToLobby();
               if (GUILayout.Button(GUIContent("Disconnect", "Disconnect"), GUILayout.Height(sc.y*0.075), GUILayout.Width(sc.x*0.1)))
                  Application.LoadLevel("mainmenu");
            GUILayout.EndVertical();
         GUILayout.EndHorizontal();
      }

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

function DrawOverallGUI()
{
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
}

function DrawRoundGUI()
{
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
}

function PressReady()
{
   if (Network.isClient)
      Game.control.netView.RPC("ToServerReadyToStartRound", RPCMode.Server);
   else
   {
      Game.control.ResetRound();
      Game.player.isReadyToStartRound = true;
   }
}

function PressRoundNum(roundNum : int)
{
   showRoundNum = roundNum;
}

function PressReturnToLobby()
{
   if (Network.isClient)
      Game.control.netView.RPC("ToServerRequestPlayerList", RPCMode.Server);

   //GUIControl.SwitchGUI(GUIControl.networkGUI.guiID);
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
