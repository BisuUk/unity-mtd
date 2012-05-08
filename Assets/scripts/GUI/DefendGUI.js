#pragma strict
#pragma downcast

import CustomWidgets;

var defendPanel : DefendGUIPanel;
var textStyle : GUIStyle;

static var selectedTypeButton : int = -1;
private var towerTypeStrings : String[] = ["Direct", "AoE"];
private var lastSelTower : GameObject = null;

function OnGUI()
{
   // New selection, open panel
   if (lastSelTower != Game.player.selectedTower)
   {
      if (Game.player.selectedTower)
      {
         defendPanel.SetTower(Game.player.selectedTower.GetComponent(Tower));
         //selectedTypeButton = GameData.player.selectedTower.GetComponent(Tower).type-1;
      }
      lastSelTower = Game.player.selectedTower;
   }

   // If panel is not open, unpress buttons
   if (defendPanel.enabled == false)
      selectedTypeButton = -1;

   // Tower type panel
   GUILayout.BeginArea(Rect(DefendGUIPanel.panelWidth+100, Screen.height-120, 200, 120));
      GUILayout.BeginVertical();

         GUILayout.FlexibleSpace(); // push everything down

         // Credits
         textStyle.normal.textColor = Color(0.2,1.0,0.2);
         textStyle.fontSize = 30;
         GUILayout.Label(Game.player.credits.ToString(), textStyle);

         // Button grid
         var newTowerTypeButton : int = GUILayout.SelectionGrid(-1, towerTypeStrings, 3, GUILayout.MinHeight(50));
         if (newTowerTypeButton != -1)
         {
            // Making a new tower, open panel
            Game.player.selectedTower = null;
            selectedTypeButton = newTowerTypeButton;
            defendPanel.SetNew(newTowerTypeButton+1);
         }
      GUILayout.EndVertical();
   GUILayout.EndArea();
}