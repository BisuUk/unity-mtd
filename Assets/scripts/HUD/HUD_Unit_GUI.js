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

   // Color wheel
   GUILayout.BeginArea(Rect(0, yOffset, hudPanelHeight, hudPanelHeight));
   selectedColor = RGBCircle(selectedColor, "", colorCircle);
   playerData.SetSquadColor(playerData.selectedSquadID,selectedColor);
   GUILayout.EndArea();
   
   // Button Grid
   xOffset += 20;
   selectedSides = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, hudPanelHeight), selectedSides, selStrings, 2);
   playerData.SetSquadSides(playerData.selectedSquadID,selectedSides);

   // Size slider
   xOffset += 160;
   selectedSize = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), selectedSize, 1.0, 0.0);
   playerData.SetSquadSize(playerData.selectedSquadID,selectedSize);

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
      cursor.Show();
      hudPreviewItem.renderer.enabled = true;
   }
   if (GUILayout.Button("Del",GUILayout.Width(40), GUILayout.Height(40)))
   {
      playerData.RemoveSquad(playerData.selectedSquadID);
      selectedColor = Color.white;
      cursor.Hide();
      hudPreviewItem.renderer.enabled = false;
   }
   if (GUILayout.Button("+",GUILayout.Width(40), GUILayout.Height(40)))
   {
      playerData.IncrementSquad(playerData.selectedSquadID);
   }
   if (GUILayout.Button("-",GUILayout.Width(40), GUILayout.Height(40)))
   {
      playerData.DecrementSquad(playerData.selectedSquadID);
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
            var buttonSelected : boolean = playerData.selectedSquadID==sID;

            if (squad.count > 1)
               str = "x"+squad.count;

            if (GUILayout.Toggle(buttonSelected, str, invButtonStyle, GUILayout.Width(50), GUILayout.Height(50)))
            {
               // clicked inventory button
               playerData.selectedSquadID = sID;
               selectedColor = squad.color;
               selectedSize = squad.size;
               selectedSides = squad.sides;
               selectedCount = squad.count;
               hudPreviewItem.renderer.enabled = true;
               cursor.Show();
            }
   
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
