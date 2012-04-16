#pragma strict
#pragma downcast

import CustomWidgets;


var attackPanel : AttackGUIPanel;
var unitInvButtonStyle : GUIStyle;
var textStyle : GUIStyle;
static var selectedTypeButton : int = -1;
private var unitTypeStrings : String[] = ["8", "7", "6", "5", "4", "3"];
private var unitInvScrollPosition : Vector2;

function OnGUI()
{
   var e : Event = Event.current;
   var selSquad : UnitSquad = GameData.player.selectedSquad;

   GUILayout.BeginArea(Rect(AttackGUIPanel.panelWidth+10, Screen.height-200, Screen.width-AttackGUIPanel.panelWidth+10, 200));

      // Tower type /panel
      GUILayout.BeginVertical(GUILayout.Width(AttackGUIPanel.panelWidth-4), GUILayout.Height(200));

         GUILayout.FlexibleSpace(); // push everything down

         // Credits
         GUILayout.Label(GUIContent(GameData.player.credits.ToString(), "Credits"), textStyle);

         // Button grid
         var newUnitTypeButton : int = GUILayout.SelectionGrid(selectedTypeButton, unitTypeStrings, 3, GUILayout.MinHeight(50));
         if (newUnitTypeButton != selectedTypeButton)
         {
            selectedTypeButton = newUnitTypeButton;
            attackPanel.squad = new UnitSquad();
            attackPanel.enabled = true;
         }
      GUILayout.EndVertical();

      // Squad inventory
      unitInvScrollPosition = GUILayout.BeginScrollView(unitInvScrollPosition, GUILayout.Width(245), GUILayout.Height(200));
         var invCols : int = 270/55;
         var colCount : int = 0;

         GUILayout.BeginHorizontal("box");
   
            // Loop through all squads and draw buttons for each
            for (var sID in GameData.player.squads.Keys)
            {
               var str : String;
               var squad : UnitSquad = GameData.player.squads[sID];
               var selectedSquadButton : boolean = (selSquad!=null && selSquad.id==sID);
   
               // Show how many units are deployed and total
               str = squad.unitsDeployed+"/"+squad.count;
   
               // Tint button yellow if all units are deployed, red if still deploying
               if (squad.deployed)
                  GUI.color = (squad.unitsToDeploy > 0) ? Color.red : Color.yellow;
   
               // Draw button, check if new squad was selected
   
               var newlySelectedSquadButton : boolean = GUILayout.Toggle(selectedSquadButton, str, unitInvButtonStyle, GUILayout.Width(50), GUILayout.Height(50));
               if (newlySelectedSquadButton != selectedSquadButton)
                  GameData.player.SelectSquad(sID);
   
               // Return tint to white
               GUI.color = Color.white;
   
               // Check if we need to start a new row of buttons
               colCount++;
               if (colCount >= invCols)
               {
                  colCount = 0;
                  GUILayout.EndHorizontal();
                  GUILayout.BeginHorizontal("box");
               }
            }
            if (colCount < invCols)
               GUILayout.EndHorizontal();
      GUILayout.EndScrollView();

   GUILayout.EndArea();



   // RMB de-selects
   if (e.type == EventType.MouseDown && e.isMouse && e.button == 1)
   {
      GameData.player.selectedSquad = null;
   }

   // If we don't click on anything, unselect squad
   //if (selSquad && e.type == EventType.MouseDown && e.isMouse && e.button == 0)
   //{
   //   //Debug.Log("mouseY= "+Input.mousePosition.y+" screenY="+Screen.height);
   //   // Make sure the mouse is out over the map.
   //   if (Input.mousePosition.y > panelHeight)
   //   {
   //      var hit : RaycastHit;
   //      var mask = 1 << 10;
   //      var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
   //      if (!Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask ))
   //         GameData.player.selectedSquadID = -1;
   //   }
   //}

}

function Update()
{

}






