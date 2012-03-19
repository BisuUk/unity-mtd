#pragma strict
#pragma downcast

import HUD_Widgets;

// All Scripts
static var selectedColor : Color = Color.white;
static var selectedSize  : float = 0.0;
static var selectedSides : int = 0;
static var selectedCount : int = 0;
static var pulsateScale : float = 0.0;
static var pulsateDuration : float = 0.25;

// Editor
var hudPreviewCamera : GameObject;
var hudPreviewItemPos : Transform;
var playerObject : GameObject;
var colorCircle : Texture2D;
var hudPanelHeight : int = Screen.height*0.25;
var unitInvButtonStyle : GUIStyle;

// This Script only
private var playerData : PlayerData;
private var idGenerator : int;
private var cursorObject : GameObject;
private var hudPreviewItem : GameObject;

// UNIT HUD
private var unitInvScrollPosition : Vector2;
private var unitSidesStrings : String[] = ["8", "7", "6", "5", "4", "3"];
private var unitSelectedSidesButton : int=-1;
private var unitLastSelSquadID : int = -1;



function Start()
{
   selectedColor = Color.white;
   selectedSize  = 0;
   selectedSides = 8;
   selectedCount = 1;

   if (playerObject)
      playerData = playerObject.GetComponent(PlayerData);

   // Create a ground plane for mouse interactions
   var groundPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
   groundPlane.transform.position = Vector3(0,0,0);
   groundPlane.transform.localScale = Vector3(100,100,100);
   groundPlane.renderer.enabled = false;
   groundPlane.layer = 9; // UI layer
   groundPlane.name = "GroundPlane";
}


function OnGUI ()
{
   var xOffset : int = hudPanelHeight;
   var yOffset : int = Screen.height-hudPanelHeight;
   var selSquad : UnitSquad = playerData.selectedSquad();
   var e : Event = Event.current;

   if (selSquad)
   {
      selectedCount = selSquad.count; // Cursor will reference this

      // If we selected a new squad, load new preview and cursor
      if (unitLastSelSquadID != selSquad.id)
      {
         NewHudUnitPreviewItem(selSquad.sides);
         NewUnitCursor(selSquad.sides);
      }

      // Pulsate effect
      DoPulsate();

      // Set cursor visibility based on squad deployment status
      // We don't delete b/c if we're still selected after undeploy
      // the cursor will just pop right up, no need to check for
      // a change in deployment status.
      if (cursorObject)
         cursorObject.renderer.enabled = !selSquad.deployed;

      unitLastSelSquadID = selSquad.id;
   }
   else if (unitLastSelSquadID != -1)
   {
      unitLastSelSquadID = -1;
      NewUnitCursor(0);
      NewHudUnitPreviewItem(0);
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
   unitSelectedSidesButton = (selSquad) ? 8-selSquad.sides : 0;
   var newlySelectedSidesButton : int = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, hudPanelHeight), unitSelectedSidesButton, unitSidesStrings, 2);
   if (selSquad && !selSquad.deployed && unitSelectedSidesButton != newlySelectedSidesButton)
   {
      // Assign new sides to squad
      unitSelectedSidesButton = newlySelectedSidesButton;
      selectedSides = 8-newlySelectedSidesButton;
      playerData.SetSquadSides(selSquad.id, selectedSides);
      NewUnitCursor(selSquad.sides);
      NewHudUnitPreviewItem(selSquad.sides);
   }

   // Size slider
   xOffset += 160;
   selectedSize = (selSquad) ? selSquad.size : 0;
   var newlySelectedSize : float = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), selectedSize, 0.5, 0.0);
   if (selSquad && !selSquad.deployed)
   {
      selectedSize = newlySelectedSize;
      playerData.SetSquadSize(selSquad.id, selectedSize);
   }

   // Move 3D preview camera to be in correct location on the HUD
   xOffset += 20;
   hudPreviewCamera.camera.pixelRect = Rect(xOffset, 10, 180, hudPanelHeight-20);

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
      
            var newSquad = new UnitSquad(idGenerator, selectedSides, selectedSize, selectedColor);
            idGenerator += 1;
            // Add squad to player inventory
            playerData.AddSquad(newSquad);
         }
         if (GUILayout.Button("Del", GUILayout.Height(hudPanelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
            {
               playerData.RemoveSquad(selSquad.id);
               selectedColor = Color.white;
               NewUnitCursor(0);
               NewHudUnitPreviewItem(0);
            }
         }
         if (GUILayout.Button("+", GUILayout.Height(hudPanelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
               playerData.ModifySquadCount(selSquad.id, (e.shift) ? 5 : 1);
         }
         if (GUILayout.Button("-", GUILayout.Height(hudPanelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
               playerData.ModifySquadCount(selSquad.id, (e.shift) ? -5 : -1);
         }
      GUILayout.EndVertical();
   GUILayout.EndArea();

   // Squad inventory
   xOffset += 60;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 270, hudPanelHeight));
      unitInvScrollPosition = GUILayout.BeginScrollView(unitInvScrollPosition, GUILayout.Width(245), GUILayout.Height(hudPanelHeight));
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
            var newlySelectedSquadButton : boolean = GUILayout.Toggle(selectedSquadButton, str, unitInvButtonStyle, GUILayout.Width(50), GUILayout.Height(50));
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

   xOffset += 280;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 50, hudPanelHeight));
      if (GUILayout.Button("GUI"))
      {
         enabled = false;
         gameObject.GetComponent(HUD_Defend_GUI).enabled = true;
         NewHudUnitPreviewItem(0);
         NewUnitCursor(0);
      }
   GUILayout.EndArea();

   // If we don't click on anything, unselect squad
   if (selSquad && e.type == EventType.MouseDown && e.isMouse && e.button == 0)
   {
      //Debug.Log("mouseY= "+Input.mousePosition.y+" screenY="+Screen.height);
      // Make sure the mouse is out over the map.
      if (Input.mousePosition.y > hudPanelHeight)
      {
         var hit : RaycastHit;
         var mask = 1 << 10;
         var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
         if (!Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask ))
            playerData.selectedSquadID = -1;
      }
   }
}

function Update()
{

}

function NewHudUnitPreviewItem(sides : int)
{
   //Debug.Log("NewHudUnitPreviewItem: sides="+sides);
   if (hudPreviewItem)
   {
      for (var child : Transform in hudPreviewItem.transform)
         Destroy(child.gameObject);
      Destroy(hudPreviewItem);
   }
   if (sides>0)
   {
      var prefabName : String = Unit.PrefabName(sides);
      hudPreviewItem = Instantiate(Resources.Load(prefabName, GameObject), hudPreviewItemPos.position, Quaternion.identity);
      hudPreviewItem.layer = 8;
      hudPreviewItem.AddComponent(HUD_Attack_PreviewItem);
   }
}

function NewUnitCursor(sides : int)
{
   //Debug.Log("NewCursor: sides="+sides);
   if (cursorObject)
   {
      for (var child : Transform in cursorObject.transform)
         Destroy(child.gameObject);
      Destroy(cursorObject);
   }
   if (sides>0)
   {
      var prefabName : String = Unit.PrefabName(sides);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.GetComponent(Collider).enabled = false;

      var cursorScript = cursorObject.AddComponent(Attack_CursorControl);
      cursorScript.squad = playerData.selectedSquad();
   }
}

function DoPulsate()
{
   var t : float = Mathf.PingPong(Time.time, pulsateDuration) / pulsateDuration;
   pulsateScale = Mathf.Lerp(0.0, 0.1, t);
}