#pragma strict
#pragma downcast

import CustomWidgets;


var textStyle : GUIStyle;

static var selectedType : int;
private var selectedTypeButton : int = -1;
private var towerTypeStrings : String[] = ["Direct", "AoE", "Area"];

function OnGUI()
{
   // Tower type panel
   GUILayout.BeginArea(Rect(DefendGUIPanel.panelWidth+100, Screen.height-200, Screen.width, 200));
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
            GameData.player.selectedTower = null;
            selectedTypeButton = newTowerTypeButton;
            GUIControl.NewCursor(2,selectedTypeButton+1);
         }
      GUILayout.EndVertical();
   GUILayout.EndArea();


}
