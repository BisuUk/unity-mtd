#pragma strict
#pragma downcast

import CustomWidgets;

var panelHeightPercent : float = 0.25;
var colorCircle : Texture2D;
var previewCamera : GameObject;
var previewItemPos : Transform;
var unitInvButtonStyle : GUIStyle;
static var selectedColor : Color = Color.white;
static var selectedSize  : float = 0.0;
static var selectedUnitType : int = 0;
static var selectedCount : int = 0;
static var pulsateScale : float = 0.0;
static var pulsateDuration : float = 0.25;
static var groundPlaneOffset : float = -1.0;

private var panelHeight : int;
private var idGenerator : int;
private var cursorObject : GameObject;
private var previewItem : GameObject;
private var unitInvScrollPosition : Vector2;
private var unitTypeStrings : String[] = ["8", "7", "6", "5", "4", "3"];
private var selectedUnitTypeButton : int=-1;
private var lastSelSquadID : int = -1;
private static var playerData : PlayerData;


function Start()
{
   if (playerData == null)
   {
      var gameObj : GameObject = GameObject.Find("GameData");
      playerData = gameObj.GetComponent(PlayerData);
   }

   selectedColor = Color.white;
   selectedSize  = 0;
   selectedUnitType = 8;
   selectedCount = 1;

   // Create a ground plane for mouse interactions
   var groundPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
   groundPlane.transform.position = Vector3(0,-1,0);
   groundPlane.transform.localScale = Vector3(100,100,100);
   groundPlane.renderer.enabled = false;
   groundPlane.layer = 9; // GUI layer
   groundPlane.name = "GroundPlane";

   // Show preview camera
   previewCamera.camera.enabled = true;
}


function OnGUI()
{
   panelHeight = Screen.height*panelHeightPercent;
   var xOffset : int = panelHeight;
   var yOffset : int = Screen.height-panelHeight;
   var selSquad : UnitSquad = playerData.selectedSquad;
   var e : Event = Event.current;

   if (selSquad)
   {
      selectedCount = selSquad.count; // Cursor will reference this

      // If we selected a new squad, load new preview and cursor
      if (lastSelSquadID != selSquad.id)
      {
         NewPreviewItem(selSquad.unitType);
         NewCursor(selSquad.unitType);
      }

      // Pulsate effect
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
      NewPreviewItem(0);
      pulsateScale = 0;
   }

   // Color wheel
   GUILayout.BeginArea(Rect(0, yOffset, panelHeight, panelHeight));
      selectedColor = (selSquad) ? selSquad.color : Color.white;
      var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
      if (selSquad && !selSquad.deployed)
      {
         selectedColor = newlySelectedColor;
         selSquad.color = selectedColor;
         if (cursorObject)
            cursorObject.GetComponent(AttackGUICursorControl).color = selectedColor;
      }
   GUILayout.EndArea();
   
   // UnitType buttons grid
   xOffset += 20;
   selectedUnitTypeButton = (selSquad) ? 8-selSquad.unitType : 0;
   var newlySelectedUnitTypeButton : int = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, panelHeight), selectedUnitTypeButton, unitTypeStrings, 2);
   if (selSquad && !selSquad.deployed && selectedUnitTypeButton != newlySelectedUnitTypeButton)
   {
      // Assign new sides to squad
      selectedUnitTypeButton = newlySelectedUnitTypeButton;
      selectedUnitType = 8-newlySelectedUnitTypeButton;
      selSquad.unitType = selectedUnitType;
      NewCursor(selSquad.unitType);
      NewPreviewItem(selSquad.unitType);
   }

   // Size slider
   xOffset += 160;
   selectedSize = (selSquad) ? selSquad.size : 0;
   var newlySelectedSize : float = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, panelHeight-20), selectedSize, 0.5, 0.0);
   if (selSquad && !selSquad.deployed)
   {
      selectedSize = newlySelectedSize;
      selSquad.size = selectedSize;
      if (cursorObject)
         cursorObject.GetComponent(AttackGUICursorControl).size = selectedSize;
   }

   // Move 3D preview camera to be in correct location on the GUI
   xOffset += 20;
   previewCamera.camera.pixelRect = Rect(xOffset, 10, 180, panelHeight-20);

   // Squad controls
   xOffset += 190;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 50, panelHeight));
      GUILayout.BeginVertical("box", GUILayout.Height(panelHeight));
         if (GUILayout.Button("New", GUILayout.Height(panelHeight/4.8)))
         {
            // Reinit controls
            selectedUnitType = 8;
            selectedSize = 0;
            selectedColor = Color.white;

            var newSquad = new UnitSquad(idGenerator, selectedUnitType, selectedSize, selectedColor);
            newSquad.owner = Network.player;

            idGenerator += 1;
            // Add squad to player inventory
            playerData.AddSquad(newSquad);
            playerData.selectedSquad = newSquad;
         }
         if (GUILayout.Button("Del", GUILayout.Height(panelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
            {
               playerData.RemoveSquad(selSquad.id);
               selectedColor = Color.white;
               NewCursor(0);
               NewPreviewItem(0);
            }
         }
         if (GUILayout.Button("+", GUILayout.Height(panelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
            {
               var addAmount = (e.shift) ? ((selSquad.count==1) ? 4 : 5) : 1;
               selSquad.count += addAmount;
               if (cursorObject)
                  cursorObject.GetComponent(AttackGUICursorControl).indexNumber += addAmount;
            }
         }
         if (GUILayout.Button("-", GUILayout.Height(panelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
            {
               selSquad.count += (e.shift) ? -5 : -1;
               if (cursorObject)
                  cursorObject.GetComponent(AttackGUICursorControl).indexNumber += (e.shift) ? -5 : -1;

            }
         }
      GUILayout.EndVertical();
   GUILayout.EndArea();

   // Squad inventory
   xOffset += 60;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 270, panelHeight));
      unitInvScrollPosition = GUILayout.BeginScrollView(unitInvScrollPosition, GUILayout.Width(245), GUILayout.Height(panelHeight));
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
               playerData.SelectSquad(sID);

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
   GUILayout.BeginArea(Rect(xOffset, yOffset, 50, panelHeight));
      if (GUILayout.Button("GUI"))
      {
         enabled = false;
         gameObject.GetComponent(DefendGUI).enabled = true;
         NewPreviewItem(0);
         NewCursor(0);
      }
   GUILayout.EndArea();

   // RMB de-selects
   if (e.type == EventType.MouseDown && e.isMouse && e.button == 1)
   {
      playerData.selectedSquad = null;
   }

/*
   // If we don't click on anything, unselect squad
   if (selSquad && e.type == EventType.MouseDown && e.isMouse && e.button == 0)
   {
      //Debug.Log("mouseY= "+Input.mousePosition.y+" screenY="+Screen.height);
      // Make sure the mouse is out over the map.
      if (Input.mousePosition.y > panelHeight)
      {
         var hit : RaycastHit;
         var mask = 1 << 10;
         var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
         if (!Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask ))
            playerData.selectedSquadID = -1;
      }
   }
*/
}

function Update()
{

}

function NewPreviewItem(sides : int)
{
   if (previewItem)
   {
      for (var child : Transform in previewItem.transform)
         Destroy(child.gameObject);
      Destroy(previewItem);
   }
   if (sides>0)
   {
      var prefabName : String = Unit.PrefabName(sides);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.GetComponent(Unit).enabled = false;
      previewItem.layer = 8; // 3D GUI layer
      previewItem.tag = "";
      previewItem.name = "AttackGUIPreviewItem";

      previewItem.AddComponent(AttackGUIPreviewItem);
   }
}

function NewCursor(sides : int)
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
      cursorObject.GetComponent(Unit).enabled = false;
      cursorObject.tag = "";
      cursorObject.name = "AttackGUICursor";

      var cursorScript = cursorObject.AddComponent(AttackGUICursorControl);
      cursorScript.setFromSquad(playerData.selectedSquad);
   }
}

function DoPulsate()
{
   var t : float = Mathf.PingPong(Time.time, pulsateDuration) / pulsateDuration;
   pulsateScale = Mathf.Lerp(0.0, 0.05, t);
}