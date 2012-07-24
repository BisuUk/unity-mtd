#pragma strict

static var guiID : int = 5;

var inset : Rect;

function OnGUI()
{
   var e : Event = Event.current;
   var sc : Vector2 = Vector2(Screen.width, Screen.height);
   var dialogRect : Rect = Rect(sc.x*inset.x, sc.y*inset.y, sc.x*inset.width, sc.y*inset.height);


   GUI.Box(dialogRect, "GAME OVER");

   GUILayout.BeginArea(dialogRect);
      GUILayout.BeginVertical();
         GUILayout.Space(30);

         GUILayout.Label("Units survived: x");
         GUILayout.Label("Units killed: x");

         GUILayout.Label("Towers built: x");
         GUILayout.Label("  Directs built: x");
         GUILayout.Label("  AOEs built: x");
         GUILayout.Label("Total damage: x");
         GUILayout.Label("Highest tower DPS: x");


         GUILayout.Label("Units built: x");
         GUILayout.Label("  Points built:   x");
         GUILayout.Label("  Healer built:   x");
         GUILayout.Label("  Tanks built:    x");
         GUILayout.Label("  Stunners built: x");
         GUILayout.Label("  Most used color: x");
      GUILayout.EndVertical();
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

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
}

