#pragma strict
#pragma downcast

import CustomWidgets;

var defendPanel : DefendGUIPanel;
var textStyle : GUIStyle;

static var selectedTypeButton : int = -1;
static var guiID : int = 3;

private var towerTypeStrings : String[] = ["Direct", "AoE"];
private var towerToSelect : GameObject = null;


function SelectTower(tower : GameObject)
{
   // Set for next GUI cycle so we can detect shift
   towerToSelect = tower;
}

function OnGUI()
{
   if (Application.isLoadingLevel)
      return;

   var e : Event = Event.current;

   if (towerToSelect)
   {
      Game.player.selectedTower = towerToSelect;
      defendPanel.SetTower(towerToSelect.GetComponent(Tower), (e.shift));
      towerToSelect = null;
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

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.Alpha1:
      case KeyCode.Keypad1:
         // Making a new tower, open panel
         Game.player.selectedTower = null;
         selectedTypeButton = 0;
         defendPanel.SetNew(1);
         break;

      case KeyCode.Alpha2:
      case KeyCode.Keypad2:
         // Making a new tower, open panel
         Game.player.selectedTower = null;
         selectedTypeButton = 1;
         defendPanel.SetNew(2);
         break;

      case KeyCode.Escape:
         // no cursor, close attack panel
         if (defendPanel.enabled)
         {
            GUIControl.DestroyCursor();
            defendPanel.enabled = false;
            Game.player.selectedTower = null;
         }
         else
         {
            GUIControl.SwitchGUI(0);
         }
         break;
      }
   }
}

function OnSwitchGUI(id : int)
{
   enabled = (id==guiID);
   if (id!=guiID)
      defendPanel.enabled = false;
}
