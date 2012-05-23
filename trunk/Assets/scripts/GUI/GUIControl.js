#pragma strict
#pragma downcast

static var previewCamera : GameObject;
static var groundPlane : GameObject;
static var colorPulsateDuration : float = 0.25;
static var colorPulsateValue : float;
static var pulsateScale : float;
static var cursorObject : GameObject;
static var attackGUI : AttackGUI;
static var defendGUI : DefendGUI;
static var networkGUI : NetworkGUI;
static var mainGUI : MainGUI;
static var titleBarGUI : TitleBarGUI;
static var activeGUI : int;

function Awake()
{
   // Persist through all levels
   SetChildrenPersist(transform);

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

function OnLevelWasLoaded()
{
   // Create a ground plane for mouse interactions
   groundPlane = GameObject.CreatePrimitive(PrimitiveType.Plane);
   groundPlane.transform.position = Vector3(0,0.5,0);
   groundPlane.transform.localScale = Vector3(100,100,100);
   groundPlane.renderer.enabled = false;
   groundPlane.layer = 2; // Ignore Raycast layer
   groundPlane.name = "GroundPlane";
}

function Update()
{
   DoPulsate();
}

static function DoPulsate()
{
   var t : float = Mathf.PingPong(Time.time, colorPulsateDuration) / colorPulsateDuration;
   colorPulsateValue = Mathf.Lerp(0.75, 1.0, t);
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
      cursorObject = Instantiate(Resources.Load(Utility.GetAbilityPrefabName(type), GameObject), Vector3.zero, Quaternion.identity);
      cursorObject.name = "AbilityFramer";
      cursorObject.tag = "";
      cursorObject.SendMessage("MakeCursor", true);
      break;
   }


}

static function Resume()
{
   if (Game.player.isAttacker)
      SwitchGUI(2);
   else
      SwitchGUI(3);
}

static function SwitchGUI(guiID : int)
{
   DestroyCursor();
   mainGUI.SendMessage("OnSwitchGUI", guiID, SendMessageOptions.DontRequireReceiver);
}

private function SetChildrenPersist(t : Transform)
{
   DontDestroyOnLoad(t.gameObject);
   for (var child : Transform in t)
      SetChildrenPersist(child);
}