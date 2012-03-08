#pragma strict

import HUD_Widgets;

// All Scripts
static var selectedColor : Color = Color.white;
static var selectedSize  : float = 0.0;
static var selectedSides : int = 0;
static var selectedCount : int = 0;
static var pulsateScale : float = 0.0;
static private var pulsateUp : boolean = true;

// Editor
var hudCamera : GameObject;
var hudPreviewItemPos : Transform;
var playerObject : GameObject;
var cursorObject : GameObject;
var colorCircle : Texture2D;
var squadID : int;
var invButtonStyle : GUIStyle;

// This Script only
private var playerData : PlayerData;
private var hudPreviewItem : GameObject;
private var scrollPosition : Vector2;
private var selStrings : String[] = ["8", "7", "6", "5", "4", "3"];
private var selectedSidesButton : int=-1;
private var lastSelSquadID : int = -1;


function Start()
{
   selectedColor = Color.white;
   selectedSize  = 0;
   selectedSides = 8;
   selectedCount = 1;

   if (playerObject)
      playerData = playerObject.GetComponent(PlayerData);
}

function DoPulsate()
{
   // Cursor pulsate params
   if (pulsateUp)
      pulsateScale += 0.004;
   else
      pulsateScale -= 0.004;
   
   if (pulsateScale > 0.07)
      pulsateUp = false;
   else if (pulsateScale < 0.0)
      pulsateUp = true;
}

function OnGUI ()
{
   var hudPanelHeight : int = Screen.height*0.25;
   var xOffset : int = hudPanelHeight;
   var yOffset : int = Screen.height-hudPanelHeight;
   var selSquad : UnitSquad = playerData.selectedSquad();
   var newSquadWasSelected : boolean = false;

   if (selSquad)
   {
      newSquadWasSelected = (lastSelSquadID != selSquad.id);
      selectedCount = selSquad.count;

      // If we selected a new squad, load new preview and cursor
      if (newSquadWasSelected)
      {
         NewHudPreviewItem(selSquad.sides);
         NewCursor(selSquad.sides);
      }

      DoPulsate();

      // Set cursor visibility based on squad deployment status
      // We don't delete b/c if we're still selected after undeploy
      // the cursor will just pop right up, no need to check for
      // a change in deployment status.
      if (cursorObject)
         cursorObject.renderer.enabled = !selSquad.deployed;

      lastSelSquadID = selSquad.id;
   }
   else if (lastSelSquadID != -1)
   {
      lastSelSquadID = -1;
      NewCursor(0);
      NewHudPreviewItem(0);
      pulsateScale = 0;
   }

   // Color wheel
   GUILayout.BeginArea(Rect(0, yOffset, hudPanelHeight, hudPanelHeight));
      selectedColor = (selSquad) ? selSquad.color : Color.white;
      var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
      if (selSquad && !selSquad.deployed)
      {
         selectedColor = newlySelectedColor;
         playerData.SetSquadColor(selSquad.id, selectedColor);
      }
   GUILayout.EndArea();
   
   // Sides buttons grid
   xOffset += 20;
   selectedSidesButton = (selSquad) ? 8-selSquad.sides : 0;
   var newlySelectedSidesButton : int = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, hudPanelHeight), selectedSidesButton, selStrings, 2);
   if (selSquad && !selSquad.deployed && selectedSidesButton != newlySelectedSidesButton)
   {
      // Assign new sides to squad
      selectedSidesButton = newlySelectedSidesButton;
      selectedSides = 8-newlySelectedSidesButton;
      playerData.SetSquadSides(selSquad.id, selectedSides);
      NewCursor(selSquad.sides);
      NewHudPreviewItem(selSquad.sides);
   }

   // Size slider
   xOffset += 160;
   selectedSize = (selSquad) ? selSquad.size : 0;
   var newlySelectedSize : float = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), selectedSize, 1.0, 0.0);
   if (selSquad && !selSquad.deployed)
   {
      selectedSize = newlySelectedSize;
      playerData.SetSquadSize(selSquad.id, selectedSize);
   }

   // Move 3D preview camera to be in correct location on the HUD
   xOffset += 20;
   hudCamera.camera.pixelRect = Rect(xOffset, 10, 180, hudPanelHeight-20);

   // Squad controls
   xOffset += 190;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 50, hudPanelHeight));
      GUILayout.BeginVertical("box", GUILayout.Height(hudPanelHeight));
         if (GUILayout.Button("New", GUILayout.Height(hudPanelHeight/4.8)))
         {
            // Reinit controls
            selectedSides = 8;
            selectedSize = 0;
            selectedColor = Color.white;
      
            // MULTIPLAYER - Request squad ID  from server?
      
            var newSquad = new UnitSquad(squadID, selectedSides, selectedSize, selectedColor);
            squadID += 1;
            // Add squad to player inventory
            playerData.AddSquad(newSquad);
         }
         if (GUILayout.Button("Del", GUILayout.Height(hudPanelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
            {
               playerData.RemoveSquad(selSquad.id);
               selectedColor = Color.white;
               NewCursor(0);
               NewHudPreviewItem(0);
            }
         }
         if (GUILayout.Button("+", GUILayout.Height(hudPanelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
               playerData.IncrementSquad(selSquad.id);
         }
         if (GUILayout.Button("-", GUILayout.Height(hudPanelHeight/4.8)))
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

         // Loop through all squads and draw buttons for each
         for (var sID in playerData.squads.Keys)
         {
            var str : String;
            var squad : UnitSquad = playerData.squads[sID];
            var selectedSquadButton : boolean = (selSquad!=null && selSquad.id==sID);

            // Show how many units are deployed and total
            str = squad.unitsDeployed+"/"+squad.count;

            // Tint button yellow if all units are deployed, red if still deploying
            if (squad.deployed)
               GUI.color = (squad.unitsToDeploy > 0) ? Color.red : Color.yellow;

            // Draw button, check if new squad was selected
            var newlySelectedSquadButton : boolean = GUILayout.Toggle(selectedSquadButton, str, invButtonStyle, GUILayout.Width(50), GUILayout.Height(50));
            if (newlySelectedSquadButton != selectedSquadButton)
               playerData.selectedSquadID = sID;

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


   if (Input.GetMouseButtonDown(0))
   {
      //Debug.Log("mouseY= "+Input.mousePosition.y+" screenY="+Screen.height);
      if (Input.mousePosition.y > hudPanelHeight)
      {
         var hit : RaycastHit;
         var mask = 1 << 10;
         var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
         if (!Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask ))
         {
            playerData.selectedSquadID = -1;
         }
      }
   }

}

function NewHudPreviewItem(sides : int)
{
   //Debug.Log("NewHudPreviewItem: sides="+sides);
   if (hudPreviewItem)
      Destroy(hudPreviewItem);
   if (sides>0)
   {
      var prefabName : String = Unit.PrefabName(sides);
      hudPreviewItem = Instantiate(Resources.Load(prefabName, GameObject), hudPreviewItemPos.position, Quaternion.identity);
      hudPreviewItem.layer = 8;
      hudPreviewItem.AddComponent(HUD_Unit_PreviewItem);
   }
}

function NewCursor(sides : int)
{
   //Debug.Log("NewCursor: sides="+sides);
   if (cursorObject)
      Destroy(cursorObject);
   if (sides>0)
   {
      var cursorUnitPrefabName : String = Unit.PrefabName(sides);
      cursorObject = Instantiate(Resources.Load(cursorUnitPrefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.AddComponent(CursorControl);
   }
}