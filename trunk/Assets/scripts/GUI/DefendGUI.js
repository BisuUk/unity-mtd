#pragma strict
#pragma downcast

import CustomWidgets;

var panelHeightPercent : float = 0.25;
var colorCircle : Texture2D;
var previewCamera : GameObject;
var previewItemPos : Transform;
var netView : NetworkView;
static var selectedColor : Color = Color.white;
static var selectedRange  : float = 2.0;
static var selectedType : int = 1;
static var pulsateScale : float = 0.0;
static var pulsateDuration : float = 0.25;

private var panelHeight : int;
private var idGenerator : int;
private var cursorObject : GameObject;
private var previewItem : GameObject;
private var towerTypeStrings : String[] = ["Pulse", "Proj", "Amp"];
private var selectedTypeButton : int = -1;
private static var playerData : PlayerData;

function Start()
{
   if (playerData == null)
   {
      var gameObj : GameObject = GameObject.Find("GameData");
      playerData = gameObj.GetComponent(PlayerData);
   }

   // Create a ground plane for mouse interactions
   var groundPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
   groundPlane.transform.position = Vector3(0,0,0);
   groundPlane.transform.localScale = Vector3(100,100,100);
   groundPlane.renderer.enabled = false;
   groundPlane.layer = 9; // GUI layer
   groundPlane.name = "GroundPlane";

   // Show preview camera
   previewCamera.camera.enabled = true;
}


@RPC
function CreateTower(towerType : int, pos : Vector3, rot : Quaternion, towerRange : float, colorRed : float, colorGreen : float, colorBlue : float)
{
   var prefabName : String = Tower.PrefabName(towerType);
   var newTower : GameObject = Network.Instantiate(Resources.Load(prefabName, GameObject), pos, rot, 0);
   newTower.BroadcastMessage("SetRange", towerRange);
   newTower.BroadcastMessage("SetColor",Color(colorRed, colorGreen, colorBlue));
   newTower.BroadcastMessage("Init");
}


function OnGUI ()
{
   panelHeight = Screen.height*panelHeightPercent;
   var xOffset : int = panelHeight;
   var yOffset : int = Screen.height-panelHeight;
   var e : Event = Event.current;

   // Color wheel
   GUILayout.BeginArea(Rect(0, yOffset, panelHeight, panelHeight));
      var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
      selectedColor = newlySelectedColor;
   GUILayout.EndArea();

   // Tower type button grid
   xOffset += 20;
   var newTowerTypeButton : int = GUI.SelectionGrid(Rect(xOffset, yOffset, 150, panelHeight), selectedTypeButton, towerTypeStrings, 3);
   if (newTowerTypeButton != selectedTypeButton)
   {
      selectedTypeButton = newTowerTypeButton;
      NewCursor(selectedTypeButton+1);
      NewPreviewItem(selectedTypeButton+1);
   }

   // Range slider
   xOffset += 160;
   var newlySelectedRange: float = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, panelHeight-20), selectedRange, 10.0, Tower.baseRange);
   if (selectedRange != newlySelectedRange)
   {
      selectedRange = newlySelectedRange;

      if (cursorObject)
         cursorObject.BroadcastMessage("SetRange", selectedRange);
      //if (playerData.selectedTower)
         //playerData.selectedTower.BroadcastMessage("SetRange", selectedSize);
   }

   // Move 3D preview camera to be in correct location on the GUI
   xOffset += 20;
   previewCamera.camera.pixelRect = Rect(xOffset, 10, 180, panelHeight-20);

   xOffset += 280;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 50, panelHeight));
      if (GUILayout.Button("GUI"))
      {
         enabled = false;
         NewCursor(0);
         NewPreviewItem(0);
         gameObject.GetComponent(AttackGUI).enabled = true;
      }
   GUILayout.EndArea();

   // Mouse click event on map area
   if (e.type == EventType.MouseDown && e.isMouse && Input.mousePosition.y > panelHeight)
   {
      if (cursorObject)
      {
         var c : DefendGUICursorControl = cursorObject.GetComponent(DefendGUICursorControl);
         if (e.button == 0)
         {
            c.mode += 1; // place, rotate.
            if (c.mode == 2)
            {
               // Check cost here

               // Place tower in scene
               netView.RPC("CreateTower", RPCMode.Server, selectedTypeButton+1, cursorObject.transform.position, cursorObject.transform.rotation, selectedRange, selectedColor.r, selectedColor.g, selectedColor.b);
               //var prefabName : String = Tower.PrefabName(selectedTypeButton+1);
               //var newTower : GameObject = Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation);
               //var newTower : GameObject = Network.Instantiate(Resources.Load(prefabName, GameObject), cursorObject.transform.position, cursorObject.transform.rotation, 0);
               //newTower.BroadcastMessage("Init");
   
               //playerData.selectedTower = newTower;
               NewCursor(selectedTypeButton+1);
            }
         }
         else if (e.button == 1) // RMB undo placement
         {
            // Reset placement mode
            if (c.mode==0)
            {
               NewCursor(0);
               playerData.selectedTower = null;
               selectedTypeButton = -1;
            }
            else
               c.mode = 0;
         }
      }
      else // no cursorObject
      {
         // RMB de-selects
         if (e.button == 1)
         {
            playerData.selectedTower = null;
            selectedTypeButton = -1;
         }
      }
   }
}


function NewPreviewItem(type : int)
{
   //Debug.Log("NewPreviewItem: type="+type);
   if (previewItem)
   {
      for (var child : Transform in previewItem.transform)
         Destroy(child.gameObject);
      Destroy(previewItem);
   }
   if (type>0)
   {
      var prefabName : String = Tower.PrefabName(type);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.BroadcastMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
      previewItem.layer = 8; // 3D GUI layer
      previewItem.name = "DefendGUIPreviewItem";
      previewItem.AddComponent(DefendGUIPreviewItem);
      for (var child : Transform in previewItem.transform)
         child.gameObject.layer = 8; // 3D GUI layer
   }
}


function NewCursor(type : int)
{
   //Debug.Log("NewCursor: type="+type);
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
      cursorObject.name = "DefendGUICursor";
      var c : DefendGUICursorControl = cursorObject.AddComponent(DefendGUICursorControl);
      cursorObject.BroadcastMessage("SetRange", selectedRange);
      cursorObject.BroadcastMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
      // Switch based on TYPE
      c.fov = Tower.baseFOV;
   }
}

function DoPulsate()
{
   var t : float = Mathf.PingPong(Time.time, pulsateDuration) / pulsateDuration;
   pulsateScale = Mathf.Lerp(0.0, 0.1, t);
}