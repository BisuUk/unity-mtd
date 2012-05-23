#pragma strict
#pragma downcast

import CustomWidgets;

var textStyle : GUIStyle;

function OnGUI()
{
   if (Application.isLoadingLevel)
      return;
      
   var e : Event = Event.current;
   var scoreWidth : float = (Screen.width*0.35);

   GUILayout.BeginArea(Rect(Screen.width-scoreWidth, 0, scoreWidth, 60));
      GUILayout.BeginHorizontal();
         GUILayout.FlexibleSpace();
         // Score
         GUILayout.Label(GUIContent("Score: "+Game.control.score.ToString(), "Score"), textStyle, GUILayout.MinWidth(40));

         GUILayout.Space(20);
         // Time
         var timeString : String;
         if (Game.control.roundTimeRemaining < 10)
         {
            timeString = Game.control.roundTimeRemaining.ToString("#0.0");
         }
         else
         {
            var minutes : float = Mathf.Floor(Game.control.roundTimeRemaining/60.0);
            var seconds : float = Mathf.Floor(Game.control.roundTimeRemaining%60.0);
            timeString = minutes.ToString("#0")+":"+seconds.ToString("#00");
         }
         GUILayout.Label(GUIContent("Time: "+timeString, "TimeLeft"), textStyle,GUILayout.MinWidth(40));

         GUILayout.Space(10);

      GUILayout.EndHorizontal();
   GUILayout.EndArea();

   // RMB de-selects
   //if (e.isKey && e.type == EventType.KeyDown)
   //{
      //switch (e.keyCode)
      //{
         //case KeyCode.Escape:
           // Game.player.selectedEmitter = null;
            //GUIControl.SwitchGUI(0);
         //break;
      //}
   //}
}

function OnSwitchGUI(id : int)
{
   enabled = (id==2 || id==3);
}







