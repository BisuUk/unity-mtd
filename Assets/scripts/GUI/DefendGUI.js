#pragma strict
#pragma downcast

import CustomWidgets;

var defendPanel : DefendGUIPanel;
var textStyle : GUIStyle;

static var selectedType : int;
private var selectedTypeButton : int = -1;
private var towerTypeStrings : String[] = ["Direct", "AoE"];
private var lastSelTower : GameObject = null;

function OnGUI()
{
   var e : Event = Event.current;

   // New selection, open panel
   if (lastSelTower != GameData.player.selectedTower)
   {
      if (GameData.player.selectedTower)
         defendPanel.SetTower(GameData.player.selectedTower.GetComponent(Tower));
      lastSelTower = GameData.player.selectedTower;
   }

   // Tower type panel
   GUILayout.BeginArea(Rect(DefendGUIPanel.panelWidth+100, Screen.height-120, 200, 120));
      GUILayout.BeginVertical();

         GUILayout.FlexibleSpace(); // push everything down

         // Credits
         textStyle.normal.textColor = Color(0.2,1.0,0.2);
         textStyle.fontSize = 30;
         GUILayout.Label(GameData.player.credits.ToString(), textStyle);

         // Button grid
         var newTowerTypeButton : int = GUILayout.SelectionGrid(selectedTypeButton, towerTypeStrings, 3, GUILayout.MinHeight(50));
         if (newTowerTypeButton != selectedTypeButton)
         {
            // Making a new tower, open panel
            GameData.player.selectedTower = null;
            selectedTypeButton = newTowerTypeButton;
            defendPanel.SetNew(newTowerTypeButton+1);
         }
      GUILayout.EndVertical();
   GUILayout.EndArea();

   // RMB de-selects
   if (e.type == EventType.MouseDown && e.isMouse && e.button == 1)
   {
      GameData.player.selectedTower = null;
      defendPanel.enabled = false;
      selectedTypeButton = -1;
      GUIControl.DestroyCursor();
   }
}
