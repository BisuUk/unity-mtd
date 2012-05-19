#pragma strict
#pragma downcast

import CustomWidgets;

var attackPanel : AttackGUIPanel;
var colorCircle : Texture2D;
var textStyle : GUIStyle;
var selectedAbility : int;
var abilityColor : Color = Color.white;

static var guiID : int = 2;

function OnGUI()
{
   if (Application.isLoadingLevel)
      return;

   var e : Event = Event.current;

   GUILayout.BeginArea(Rect(AttackGUIPanel.panelWidth+10, Screen.height-60, 200, 60));
      GUILayout.BeginHorizontal();
            // Credits
            textStyle.normal.textColor = Color(0.2,1.0,0.2);
            textStyle.fontSize = 30;
            GUILayout.Label(GUIContent(Game.player.credits.ToString(), "Credits"), textStyle);
      GUILayout.EndHorizontal();
   GUILayout.EndArea();

   // Tower type panel
   GUILayout.BeginArea(Rect(Screen.width*0.6, Screen.height-300, 200, 300));
      GUILayout.BeginVertical();

         GUILayout.FlexibleSpace(); // push everything down

         // Color Wheel
         if (selectedAbility > 0)
         {
            var newlySelectedColor : Color = RGBCircle(abilityColor, "", colorCircle);
            if (newlySelectedColor != abilityColor)
            {
               abilityColor = newlySelectedColor;
            }
         }

         // Mana
         textStyle.normal.textColor = Color(0.4,0.4,1.0);
         textStyle.fontSize = 30;
         GUILayout.Label(Game.player.credits.ToString(), textStyle);

         // Button grid
         GUILayout.BeginHorizontal(GUILayout.MinHeight(50));
            if (GUILayout.Button("Stun", GUILayout.ExpandHeight(true)))
            {
               selectedAbility = (selectedAbility == 1) ? 0 : 1;
            }

            if (GUILayout.Button("Haste", GUILayout.ExpandHeight(true)))
            {
               selectedAbility = (selectedAbility == 2) ? 0 : 2;
            }

            if (GUILayout.Button("Color", GUILayout.ExpandHeight(true)))
            {
               selectedAbility = (selectedAbility == 3) ? 0 : 3;
            }
         GUILayout.EndHorizontal();

      GUILayout.EndVertical();
   GUILayout.EndArea();

   // RMB de-selects
   if (e.type == EventType.MouseDown && e.isMouse && e.button == 1)
   {
      attackPanel.enabled = false;
      attackPanel.emitter = null;
      Game.player.selectedEmitter = null;
      selectedAbility = 0;
      GUIControl.DestroyCursor();
   }
}

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
   if (id!=guiID)
      attackPanel.enabled = false;
}





