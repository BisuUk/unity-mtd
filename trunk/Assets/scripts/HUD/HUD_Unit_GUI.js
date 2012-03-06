#pragma strict

import HUD_Widgets;

// All Scripts
static var selectedColor : Color = Color.white;
static var selectedSize  : float = 0.0;
static var selectedSides : int = 0;
static var selectedCount : int = 0;

// Editor
var hudCamera : GameObject;
var hudPreviewItem : GameObject;
var playerObject : GameObject;
var cursorObject : GameObject;
var colorCircle : Texture2D;
var squadID : int;
var invButtonStyle : GUIStyle;

// This Script only
private var scrollPosition : Vector2;
private var selStrings : String[] = ["8", "7", "6", "5", "4", "3"];
private var playerData : PlayerData;
private var cursor : CursorControl;
private var selectedSidesButton : int=0;

function Start()
{
   selectedColor = Color.white;
   selectedSize  = 0;
   selectedSides = 8;
   selectedCount = 1;

   if (playerObject)
      playerData = playerObject.GetComponent(PlayerData);
   if (cursorObject)
      cursor =cursorObject.GetComponent(CursorControl);
}

function OnGUI ()
{
   var hudPanelHeight : int = 200;
   var xOffset : int = hudPanelHeight;
   var yOffset : int = Screen.height-hudPanelHeight;
   var selSquad : UnitSquad = playerData.selectedSquad();

   // Color wheel
   GUILayout.BeginArea(Rect(0, yOffset, hudPanelHeight, hudPanelHeight));
   selectedColor = RGBCircle(selectedColor, "", colorCircle);
   if (selSquad && !selSquad.deployed)
      playerData.SetSquadColor(selSquad.id, selectedColor);
   GUILayout.EndArea();
   
   // Button Grid
   xOffset += 20;
   selectedSidesButton = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, hudPanelHeight), selectedSidesButton, selStrings, 2);
   if (selSquad && !selSquad.deployed)
   {
      selectedSides = 8-selectedSidesButton;
      playerData.SetSquadSides(selSquad.id, selectedSides);
   }

   // Size slider
   xOffset += 160;
   selectedSize = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), selectedSize, 1.0, 0.0);
   if (selSquad && !selSquad.deployed)
      playerData.SetSquadSize(selSquad.id, selectedSize);

   // Move 3D preview to be in correct location
   xOffset += 20;
   hudCamera.camera.pixelRect = Rect(xOffset, 10, 180, hudPanelHeight-20);

   // Squad controls
   xOffset += 190;
   GUILayout.BeginArea(Rect(xOffset, yOffset+10, 50, hudPanelHeight));
   GUILayout.BeginVertical("box");
   if (GUILayout.Button("New",GUILayout.Width(40), GUILayout.Height(40)))
   {
      selectedColor = Color.white;
      var newSquad = new UnitSquad();
      newSquad.id = squadID;// request from server.
      squadID += 1;
      newSquad.color = selectedColor;
      playerData.AddSquad(newSquad);
      cursor.Show(true);
      hudPreviewItem.renderer.enabled = true;
   }
   if (GUILayout.Button("Del",GUILayout.Width(40), GUILayout.Height(40)))
   {
      if (selSquad && !selSquad.deployed)
      {
         playerData.RemoveSquad(selSquad.id);
         selectedColor = Color.white;
         cursor.Show(false);
         hudPreviewItem.renderer.enabled = false;
      }
   }
   if (GUILayout.Button("+",GUILayout.Width(40), GUILayout.Height(40)))
   {
      if (selSquad && !selSquad.deployed)
         playerData.IncrementSquad(selSquad.id);
   }
   if (GUILayout.Button("-",GUILayout.Width(40), GUILayout.Height(40)))
   {
      if (selSquad && !selSquad.deployed)
         playerData.DecrementSquad(selSquad.id);
   }
   GUILayout.EndVertical();
   GUILayout.EndArea();

   // Squad inventory
   xOffset += 60;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 270, hudPanelHeight));
      scrollPosition = GUILayout.BeginScrollView(scrollPosition, GUILayout.Width(245), GUILayout.Height(hudPanelHeight));

         var invCols : int = 270/55;
         var colCount : int = 0;
   
         GUILayout.BeginHorizontal("box");

         for (var sID in playerData.squads.Keys)
         {
            var str : String;
            var squad : UnitSquad = playerData.squads[sID];
            var buttonSelected : boolean = (playerData.selectedSquadID==sID);

            str = squad.unitsDeployed+"/"+squad.count;

            if (squad.deployed)
               GUI.color = Color.red;

            if (GUILayout.Toggle(buttonSelected, str, invButtonStyle, GUILayout.Width(50), GUILayout.Height(50)))
            //if (GUILayout.Toggle(buttonSelected, str, invButtonStyle, GUILayout.Width(50), GUILayout.Height(50)))
            {
               // clicked inventory button
               playerData.selectedSquadID = sID;
               selectedColor = squad.color;
               selectedSize = squad.size;
               selectedSides = squad.sides;
               selectedCount = squad.count;
               hudPreviewItem.renderer.enabled = true;
               cursor.Show(!squad.deployed);
            }

            GUI.color = Color.white;

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
}
