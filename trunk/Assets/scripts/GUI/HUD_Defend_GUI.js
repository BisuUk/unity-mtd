#pragma strict
#pragma downcast

import HUD_Widgets;

// All Scripts
static var selectedColor : Color = Color.white;
static var selectedSize  : float = 0.0;
static var selectedType : int = 0;
static var pulsateScale : float = 0.0;
static private var pulsateUp : boolean = true;

// Editor
var hudPreviewCamera : GameObject;
var hudPreviewItemPos : Transform;
var playerObject : GameObject;
var colorCircle : Texture2D;
var hudPanelHeight : int = Screen.height*0.25;

// This Script only
private var playerData : PlayerData;
private var idGenerator : int;
private var cursorObject : GameObject;
private var hudPreviewItem : GameObject;

// TOWER HUD
private var towerTypeStrings : String[] = ["Beam", "Proj", "Amp"];
private var towerSelectedTypeButton : int = -1;

function Start()
{
   selectedColor = Color.white;
   selectedSize  = 0;
   selectedType = 1;

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
   var e : Event = Event.current;

   // Color wheel
   GUILayout.BeginArea(Rect(0, yOffset, hudPanelHeight, hudPanelHeight));
      var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
      selectedColor = newlySelectedColor;
   GUILayout.EndArea();

   // Tower type button grid
   xOffset += 20;
   var newTowerTypeButton : int = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, hudPanelHeight), towerSelectedTypeButton, towerTypeStrings, 3);
   if (newTowerTypeButton != towerSelectedTypeButton)
   {
      towerSelectedTypeButton = newTowerTypeButton;
      NewTowerCursor(towerSelectedTypeButton+1);
      NewHudTowerPreviewItem(towerSelectedTypeButton+1);
   }

   // Size slider
   xOffset += 160;
   var newlySelectedSize : float = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), selectedSize, 0.5, 0.0);
   //if (selSquad && !selSquad.deployed)
   //{
      selectedSize = newlySelectedSize;
      //playerData.SetSquadSize(selSquad.id, selectedSize);
   //}

   xOffset += 280;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 50, hudPanelHeight));
      if (GUILayout.Button("GUI"))
      {
         enabled = false;
         NewTowerCursor(0);
         NewHudTowerPreviewItem(0);
         gameObject.GetComponent(HUD_Attack_GUI).enabled = true;
      }
   GUILayout.EndArea();

   // If we don't click on anything, unselect squad
   if (cursorObject && e.type == EventType.MouseDown && e.isMouse && e.button == 0)
   {
      //Debug.Log("mouseY= "+Input.mousePosition.y+" screenY="+Screen.height);
      // Make sure the mouse is out over the map.
      if (Input.mousePosition.y > hudPanelHeight)
      {
         var c : Defend_CursorControl = cursorObject.GetComponent(Defend_CursorControl);
         c.range = TowerBeam.baseRange;
         c.fov = TowerBeam.baseFOV;
         c.mode += 1; // place, rotate. FOV?
         if (c.mode == 2)
         {
            // Place tower in scene
            var prefabName : String = Tower.PrefabName(towerSelectedTypeButton+1);
            var newTower : GameObject = Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation);
            newTower.transform.localScale = Vector3(
               Tower.baseScale.x + selectedSize,
               Tower.baseScale.y + selectedSize,
               Tower.baseScale.z + selectedSize);
            newTower.renderer.material.color = selectedColor;
            for (var child : Transform in newTower.transform)
               child.renderer.material.color = selectedColor;
            newTower.layer = 11;

            // Add behavior component based on type
            newTower.AddComponent(TowerBeam);
            newTower.GetComponent(TowerBeam).origRotation = newTower.transform.rotation;
            playerData.selectedTower = newTower;

            NewTowerCursor(towerSelectedTypeButton+1);
         }
      }
   }
}


function NewHudTowerPreviewItem(type : int)
{
   //Debug.Log("NewHudTowerPreviewItem: type="+type);
   if (hudPreviewItem)
   {
      for (var child : Transform in hudPreviewItem.transform)
         Destroy(child.gameObject);
      Destroy(hudPreviewItem);
   }
   if (type>0)
   {
      var prefabName : String = Tower.PrefabName(type);
      hudPreviewItem = Instantiate(Resources.Load(prefabName, GameObject), hudPreviewItemPos.position, Quaternion.identity);
      hudPreviewItem.layer = 8;
      hudPreviewItem.AddComponent(HUD_Defend_PreviewItem);
      for (var child : Transform in hudPreviewItem.transform)
          child.gameObject.layer = 8;
   }
}


function NewTowerCursor(type : int)
{
   //Debug.Log("NewTowerCursor: type="+type);
   if (cursorObject)
   {
      for (var child : Transform in cursorObject.transform)
         Destroy(child.gameObject);
      Destroy(cursorObject);
   }
   if (type>0)
   {
      var prefabName : String = Tower.PrefabName(type);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.AddComponent(Defend_CursorControl);
   }
}

function DoPulsate()
{
   // Cursor pulsate params
   if (pulsateUp)
      pulsateScale += 0.1 * Time.deltaTime;
   else
      pulsateScale -= 0.1 * Time.deltaTime;

   if (pulsateScale > 0.07)
      pulsateUp = false;
   else if (pulsateScale < 0.0)
      pulsateUp = true;
}