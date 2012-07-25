#pragma strict

static var guiID : int = 0;

function OnGUI()
{
   var e : Event = Event.current;
/*
   GUILayout.BeginArea(Rect(0, 0, Screen.width, Screen.height));
      GUILayout.BeginVertical();

         GUILayout.Space(Screen.height/2-Screen.height*0.30);

         GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Multiplayer", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
            {
               PressMulti();
            }
            GUILayout.FlexibleSpace();
         GUILayout.EndHorizontal();

         GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Single Player", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
            {
               PressSingle();
            }
            GUILayout.FlexibleSpace();
         GUILayout.EndHorizontal();

         GUILayout.Space(20);

         GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Exit", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
            {
               PressExit();
            }
            GUILayout.FlexibleSpace();
         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();
*/
   if (e.isKey && e.type == EventType.KeyDown)
   {
      switch (e.keyCode)
      {
         case KeyCode.Escape:
            GUIControl.Back();
         break;
      }
   }
}

function PressMulti()
{
   GUIControl.SwitchGUI(1);
}

function PressSingle()
{
   // Coming from a network game.
   if (Network.isClient || Network.isServer)
      Network.Disconnect();
   
   Game.hostType = 0;
   Game.control.InitRound();
}

function PressExit()
{
   Application.Quit();
}

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
}

function OnEnable()
{
   if (Game && Game.control)
      Game.control.roundInProgress = false;
}
