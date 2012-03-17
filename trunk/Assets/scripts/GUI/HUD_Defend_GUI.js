#pragma strict
#pragma downcast

import HUD_Widgets;

// All Scripts
static var selectedColor : Color = Color.white;
static var selectedSize  : float = 2.0;
static var selectedType : int = 1;
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
private var towerTypeStrings : String[] = ["Pulse", "Proj", "Amp"];
private var towerSelectedTypeButton : int = -1;

function Start()
{
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
   var newlySelectedSize : float = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, hudPanelHeight-20), selectedSize, 10.0, Tower.baseRange);
   if (selectedSize != newlySelectedSize)
   {
      selectedSize = newlySelectedSize;

      if (cursorObject)
         cursorObject.BroadcastMessage("SetRange", selectedSize);
      //if (playerData.selectedTower)
         //playerData.selectedTower.BroadcastMessage("SetRange", selectedSize);
   }

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

   // Mouse click event on map area
   if (e.type == EventType.MouseDown && e.isMouse && Input.mousePosition.y > hudPanelHeight)
   {
      if (cursorObject)
      {
         var c : Defend_CursorControl = cursorObject.GetComponent(Defend_CursorControl);
         if (e.button == 0)
         {
            c.mode += 1; // place, rotate. FOV?
            if (c.mode == 2)
            {
               // Check cost here

               // Place tower in scene
               var prefabName : String = Tower.PrefabName(towerSelectedTypeButton+1);
               var newTower : GameObject = Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation);
               newTower.layer = 11;
               //newTower.transform.localScale = Vector3(
               //   Tower.baseScale.x + selectedSize,
               //   Tower.baseScale.y + selectedSize,
               //   Tower.baseScale.z + selectedSize);
               //newTower.renderer.material.color = selectedColor;
               //for (var child : Transform in newTower.transform)
               //   child.renderer.material.color = selectedColor;

   
               // Add behavior component based on type
               var towerScript : TowerPulse = newTower.AddComponent(TowerPulse);
               towerScript.buildStartTime = Time.time;
               towerScript.origRotation = newTower.transform.rotation;
               towerScript.range = selectedSize;
               towerScript.player = playerData;
               towerScript.color = selectedColor;
   
               //playerData.selectedTower = newTower;
               NewTowerCursor(towerSelectedTypeButton+1);
            }
         }
         else if (e.button == 2)
         {
            // Reset placement mode
            if (c.mode==0)
            {
               NewTowerCursor(0);
               playerData.selectedTower = null;
               towerSelectedTypeButton = -1;
            }
            else
               c.mode = 0;
         }
      }
      else // no cursorObject
      {
         if (e.button == 2)
         {
            playerData.selectedTower = null;
            towerSelectedTypeButton = -1;
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
      var c : Defend_CursorControl = cursorObject.AddComponent(Defend_CursorControl);
      cursorObject.BroadcastMessage("SetRange", selectedSize);
      // Switch based on TYPE
      c.fov = Tower.baseFOV;
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