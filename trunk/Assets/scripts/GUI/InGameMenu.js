#pragma strict

static var guiID : int = 4;

function OnGUI()
{
   var e : Event = Event.current;

   GUILayout.BeginArea(Rect(0, 0, Screen.width, Screen.height));
      GUILayout.BeginVertical();

         GUILayout.Space(Screen.height/2-Screen.height*0.30);

         GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Main Menu", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
            {
               if (Application.loadedLevelName != "mainmenu")
                  Application.LoadLevel("mainmenu");
            }
            GUILayout.FlexibleSpace();
         GUILayout.EndHorizontal();

         if (!Network.isClient && !Network.isServer)
         {
            GUILayout.BeginHorizontal();
               GUILayout.FlexibleSpace();
               if (GUILayout.Button("Switch Role (DEBUG)", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
               {
                  Game.player.isAttacker = !Game.player.isAttacker;
                  GUIControl.SwitchGUI((Game.player.isAttacker) ? GUIControl.attackGUI.guiID : -1);
                  GUIControlInGame.SwitchGUI((Game.player.isAttacker) ? 1 : 0);
               }
               GUILayout.FlexibleSpace();
            GUILayout.EndHorizontal();
         }
         GUILayout.Space(20);

         GUILayout.BeginHorizontal();
            GUILayout.FlexibleSpace();
            if (GUILayout.Button("Exit", GUILayout.MaxWidth(Screen.width*0.20), GUILayout.MinHeight(Screen.height*0.10)))
            {
               Application.Quit();
            }
            GUILayout.FlexibleSpace();
         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();

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

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
}

