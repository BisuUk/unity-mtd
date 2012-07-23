#pragma strict
#pragma downcast

static var previewCamera : GameObject;
static var groundPlane : GameObject;
static var colorPulsateDuration : float = 0.25;
static var colorPulsateValue : float;
static var pulsateScale : float;
static var cursorObject : GameObject;
static var selectedAbility : int;
static var attackGUI : AttackGUI;
static var defendGUI : DefendGUI;
static var networkGUI : NetworkGUI;
static var mainGUI : MainGUI;
static var titleBarGUI : TitleBarGUI;
static var activeGUI : int;
static var RMBDragging : boolean;
static var currentGUI : int;
static var prevGUI : int;

private var RMBHeld : boolean;

function Awake()
{
   // No gamedata, return to main menu
   var gameData : GameObject = GameObject.Find("GameData");
   if (!gameData)
   {
      Debug.Log("GameData not found, returning to mainmenu!");
      if (Application.loadedLevelName != "mainmenu")
      {
         Application.LoadLevel("mainmenu");
         return;
      }
   }

   attackGUI = GetComponent(AttackGUI);
   defendGUI = GetComponent(DefendGUI);
   networkGUI = GetComponent(NetworkGUI);
   mainGUI = GetComponent(MainGUI);
   titleBarGUI = GetComponent(TitleBarGUI);

   // Detach preview camera from main
   previewCamera = GameObject.Find("GUIPreviewCamera");
   if (previewCamera)
   {
      previewCamera.transform.parent = null;
      previewCamera.camera.enabled = false;
   }
}

function OnGUI()
{
   DoPulsate();

   var e : Event = Event.current;

   if (!RMBHeld)
      RMBDragging = false;

   // Mouse input handling
   if (e.isMouse)
   {
      switch (e.type)
      {
         case EventType.MouseDown:
            if (e.button == 1)
            {
               RMBHeld = true;
               RMBDragging = false;
            }
            break;
         case EventType.MouseUp:
            if (e.button == 1)
               RMBHeld = false;
            break;

         case EventType.MouseDrag:
            if (RMBHeld)
               RMBDragging = true;
            break;
      }
   }
}

static function DoPulsate()
{
   var t : float = Mathf.PingPong(Time.time, colorPulsateDuration) / colorPulsateDuration;
   colorPulsateValue = Mathf.Lerp(0.3, 0.6, t);
}

static function DestroyCursor()
{
   if (cursorObject)
   {
      for (var child : Transform in cursorObject.transform)
         Destroy(child.gameObject);
      Destroy(cursorObject);
   }
}

// 1=UNIT; 2=TOWER
static function NewCursor(entType : int, type : int)
{
   DestroyCursor();

   var prefabName : String;
   // 1=UNIT; 2=TOWER
   switch (entType)
   {
   case 1:
      prefabName = Unit.PrefabName(type);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "AttackGUICursor";
      cursorObject.tag = "";
      cursorObject.GetComponent(Collider).enabled = false;

      //var cursorScript = cursorObject.AddComponent(AttackGUICursor);
      //cursorScript.setFromSquad(GameData.player.selectedSquad);
      cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
      break;
   case 2:
      prefabName = TowerUtil.PrefabName(type);
      cursorObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "DefendGUICursor";
      cursorObject.tag = "";
      cursorObject.GetComponent(Collider).enabled = false;
      cursorObject.AddComponent(DefendGUICursor);

      cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
      break;

   case 3:
      cursorObject = Instantiate(Resources.Load(AbilityBase.GetPrefabName(type), GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "AbilityFramer";
      cursorObject.tag = "";
      cursorObject.SendMessage("MakeCursor", true);
      cursorObject.collider.enabled = false;
      break;
   }
}

static function Back()
{
   GUIControl.SwitchGUI(GUIControl.prevGUI);
}

static function SwitchGUI(guiID : int)
{
   if (currentGUI != guiID)
   {
      DestroyCursor();
      prevGUI = (guiID == mainGUI.guiID) ? mainGUI.guiID : currentGUI;
      currentGUI = guiID;
      mainGUI.SendMessage("OnSwitchGUI", guiID, SendMessageOptions.DontRequireReceiver);
   }
}

static function OnScreenMessage(text : String, color : Color, duration : float)
{
   titleBarGUI.OnScreenMessage(text, color, duration);
}

