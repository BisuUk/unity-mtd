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
}


function OnGUI ()
{
   var xOffset : int = hudPanelHeight;
   var yOffset : int = Screen.height-hudPanelHeight;
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
         gameObject.GetComponent(HUD_Attack_GUI).enabled = true;
      }
   GUILayout.EndArea();
}

function Update()
{
   // If we don't click on anything, unselect squad
   if (Input.GetMouseButtonDown(0))
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
      {
          child.gameObject.layer = 8;
      }
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
      pulsateScale += 0.004;
   else
      pulsateScale -= 0.004;

   if (pulsateScale > 0.07)
      pulsateUp = false;
   else if (pulsateScale < 0.0)
      pulsateUp = true;
}