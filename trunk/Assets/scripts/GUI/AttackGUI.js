#pragma strict
#pragma downcast

import CustomWidgets;

var attackPanel : AttackGUIPanel;
var unitInvButtonStyle : GUIStyle;
var textStyle : GUIStyle;
static var selectedTypeButton : int = -1;

private var unitInvScrollPosition : Vector2;
private var lastSelSquad : UnitSquad = null;

function OnGUI()
{
   var e : Event = Event.current;
   var selSquad : UnitSquad = GameData.player.selectedSquad;

   // Ensures proper visibility setting of cursor
   if (selSquad)
   {
      // On new selection, create cursor
      if (selSquad != lastSelSquad && !selSquad.deployed)
         GUIControl.NewCursor(1, selSquad.unitType);

      // Check if cursor needs to appear or dissappear
      if (selSquad.deployed && GUIControl.cursorObject!=null)
         GUIControl.DestroyCursor();
      else if (!selSquad.deployed && GUIControl.cursorObject==null)
         GUIControl.NewCursor(1, selSquad.unitType);
   }
   else if (GUIControl.cursorObject!=null)
   {
      // Nothing selected
      GUIControl.DestroyCursor();
   }

   GUILayout.BeginArea(Rect(AttackGUIPanel.panelWidth+10, Screen.height-120, 200, 120));

      GUILayout.BeginHorizontal();
   /*
         // Tower type /panel
         GUILayout.BeginVertical();
   
            GUILayout.FlexibleSpace(); // push everything down
   
            // Credits
            GUILayout.Label(GUIContent(GameData.player.credits.ToString(), "Credits"), textStyle);
   
            // Button grid
            var newUnitTypeButton : int = GUILayout.SelectionGrid(selectedTypeButton, unitTypeStrings, 3, GUILayout.MinHeight(50));;
            if (newUnitTypeButton != selectedTypeButton)
            {
               GameData.player.selectedSquad = null;
               selectedTypeButton = newUnitTypeButton;
               attackPanel.SetNew(selectedTypeButton+1);
               selectedTypeButton = -1;
            }

         GUILayout.EndVertical();
*/
         // Squad inventory
         unitInvScrollPosition = GUILayout.BeginScrollView(unitInvScrollPosition);
            var invCols : int = 270/55;
            var colCount : int = 0;
            GUILayout.FlexibleSpace(); // push everything down
   
            GUILayout.BeginHorizontal();

               // Loop through all squads and draw buttons for each
               for (var squad in GameData.player.squads.Values)
               {
                  var selectedSquadButton : boolean = (selSquad!=null && selSquad==squad);

                  // Show how many units are deployed and total
                  var str : String = squad.unitsDeployed+"/"+squad.count;
      
                  // Tint button yellow if all units are deployed, red if still deploying
                  if (squad.deployed)
                     GUI.color = (squad.unitsToDeploy > 0) ? Color.red : Color.yellow;
      
                  // Draw button, check if new squad was selected
                  var newlySelectedSquadButton : boolean = GUILayout.Toggle(selectedSquadButton, str, unitInvButtonStyle, GUILayout.Width(50), GUILayout.Height(50));
                  if (newlySelectedSquadButton != selectedSquadButton)
                  {
                     selectedSquadButton = newlySelectedSquadButton;
                     GameData.player.selectedSquad = squad;
                     attackPanel.SetSquad(squad);
                  }
      
                  // Return tint to white
                  GUI.color = Color.white;
      
                  // Check if we need to start a new row of buttons
                  colCount++;
                  if (colCount >= invCols)
                  {
                     colCount = 0;
                     GUILayout.EndHorizontal();
                     GUILayout.Space(5);
                     GUILayout.BeginHorizontal();
                  }
               }
               if (colCount < invCols)
                  GUILayout.EndHorizontal();
         GUILayout.EndScrollView();

      GUILayout.EndHorizontal();
   GUILayout.EndArea();

   // RMB de-selects
   if (e.type == EventType.MouseDown && e.isMouse && e.button == 1)
   {
      GameData.player.selectedSquad = null;
      attackPanel.enabled = false;
      selectedTypeButton = -1;
      GUIControl.DestroyCursor();
   }

   lastSelSquad = selSquad;

}



function Update()
{

}






