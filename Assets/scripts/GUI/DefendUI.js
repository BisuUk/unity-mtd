#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var colorArea : Transform;
var numAttributeUpgrades : int = 5;

var strengthLabel : UILabel;
var rangeLabel : UILabel;
var rateLabel : UILabel;
var attributeLabel : UILabel;

private var cursor : DefendGUICursor;
private var cameraControl : CameraControl;
private var isDragging : boolean;

function Start()
{
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
   isDragging = false;
}

function OnSwitchTo()
{
   cameraControl = Camera.main.GetComponent(CameraControl);
   SwitchControlSet(0);
   UICamera.fallThrough = gameObject;
}

function OnClick()
{
   if (cursor)
   {
      // LMB
      if (UICamera.currentTouchID == -1)
      {
         if (cursor.legalLocation == false)
            GUIControl.OnScreenMessage("Invalid tower location.", Color.red, 1.5);
         else
         {
            if (cursor.NextMode())
            {
               // NOTE: Client is calculating cost, unsecure.
               //Game.player.credits -= costValue;

               // Place tower in scene
               if (!Network.isClient)
                  Game.control.CreateTower(
                     cursor.tower.type,
                     cursor.transform.position, cursor.transform.rotation,
                     cursor.tower.range,
                     cursor.tower.fov,
                     cursor.tower.fireRate,
                     cursor.tower.strength,
                     cursor.tower.effect,
                     cursor.tower.color.r, cursor.tower.color.g, cursor.tower.color.b,
                     cursor.tower.targetingBehavior,
                     cursor.tower.FOV.position);
               else
                  Game.control.netView.RPC("CreateTower", RPCMode.Server,
                     cursor.tower.type,
                     cursor.transform.position, cursor.transform.rotation,
                     cursor.tower.range,
                     cursor.tower.fov,
                     cursor.tower.fireRate,
                     cursor.tower.strength,
                     cursor.tower.effect,
                     cursor.tower.color.r, cursor.tower.color.g, cursor.tower.color.b,
                     cursor.tower.targetingBehavior,
                     cursor.tower.FOV.position);
               // Reset cursor
               cursor.SetMode(0);
            }
         }
      }
      // RMB
      else if (UICamera.currentTouchID == -2)
      {
         if (!isDragging && cursor.PrevMode())
         {
            OnAttributeBack();
            DestroyCursor();
         }
         isDragging = false;
      }
   }
}

function OnDoubleClick()
{
   cameraControl.snapToFocusLocation();
}

function OnDrag(delta : Vector2)
{
   // RMB
   if (UICamera.currentTouchID == -2)
   {
      cameraControl.Rotate(delta);
      isDragging = true;
   }
   else if (UICamera.currentTouchID == -3)
      cameraControl.Pan(delta);
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}


function DestroyCursor()
{
   if (cursor)
   {
      for (var child : Transform in cursor.transform)
         Destroy(child.gameObject);
      Destroy(cursor.gameObject);
   }
}

function NewCursor(type : int)
{
   DestroyCursor();

   var prefabName : String = TowerUtil.PrefabName(type);
   var cursorObject : GameObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "DefendGUICursor";
   cursorObject.tag = "";
   cursorObject.GetComponent(Collider).enabled = false;
   cursor = cursorObject.AddComponent(DefendGUICursor);
   cursor.SetMode(0);

   cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
}

function OnAttributeBack()
{
   DestroyCursor();
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
}

function OnMortarTower()
{
   NewCursor(3);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnRangedTower()
{
   NewCursor(1);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnSlowTower()
{
   
}

function OnPainterTower()
{
   NewCursor(2);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function SwitchControlSet(newSet : int)
{
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }

   // Switched to attribute set
   if (newSet==1)
      OnUpdateAttributes();
}

function OnUpdateAttributes()
{
   strengthLabel.text = Mathf.RoundToInt(cursor.tower.AdjustStrength(cursor.tower.strength, true) * numAttributeUpgrades).ToString();
   rangeLabel.text = Mathf.RoundToInt(cursor.tower.AdjustRange(cursor.tower.range, true) * numAttributeUpgrades).ToString();
   rateLabel.text = Mathf.RoundToInt(cursor.tower.AdjustFireRate(cursor.tower.fireRate, true) * numAttributeUpgrades).ToString();

   attributeLabel.text = "("+cursor.tower.attributePoints+"/"+cursor.tower.maxAttributePoints+")";

}

function OnRange()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   if (cursor)
   {
      var norm : float = cursor.tower.AdjustRange(cursor.tower.range, true);
      var val : float = 0.0;
      if (UICamera.currentTouchID == -1)
      {
         if (cursor.tower.AddAttributePoint())
         {
            val = norm + 1.0/numAttributeUpgrades;
            if (val > 1.0)
               val = 1.0;
         }
         else
         {
            GUIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
            return;
         }
      }
      else if (UICamera.currentTouchID == -2)
      {
         if (cursor.tower.RemoveAttributePoint())
         {
            val = norm - 1.0/numAttributeUpgrades;
            if (val < 0.0)
               val = 0.0;
         }
         else
         {
            return;
         }
      }
      cursor.tower.SetRange(cursor.tower.AdjustRange(val, false));
      OnUpdateAttributes();
   }
}

function OnStrength()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   if (cursor)
   {
      var norm : float = cursor.tower.AdjustStrength(cursor.tower.strength, true);
      var val : float = 0.0;
      if (UICamera.currentTouchID == -1)
      {
         if (cursor.tower.AddAttributePoint())
         {
            val = norm + 1.0/numAttributeUpgrades;
            if (val > 1.0)
               val = 1.0;
         }
         else
         {
            GUIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
            return;
         }
      }
      else if (UICamera.currentTouchID == -2)
      {
         if (cursor.tower.RemoveAttributePoint())
         {
            val = norm - 1.0/numAttributeUpgrades;
            if (val < 0.0)
               val = 0.0;
         }
         else
         {
            return;
         }
      }
      cursor.tower.SetStrength(cursor.tower.AdjustStrength(val, false));
      OnUpdateAttributes();
   }
}

function OnRate()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   if (cursor)
   {
      var norm : float = cursor.tower.AdjustFireRate(cursor.tower.fireRate, true);
      var val : float = 0.0;
      if (UICamera.currentTouchID == -1)
      {
         if (cursor.tower.AddAttributePoint())
         {
            val = norm + 1.0/numAttributeUpgrades;
            if (val > 1.0)
               val = 1.0;
         }
         else
         {
            GUIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
            return;
         }
      }
      else if (UICamera.currentTouchID == -2)
      {
         if (cursor.tower.RemoveAttributePoint())
         {
            val = norm - 1.0/numAttributeUpgrades;
            if (val < 0.0)
               val = 0.0;
         }
         else
         {
            return;
         }
      }
      cursor.tower.SetFireRate(cursor.tower.AdjustFireRate(val, false));
      OnUpdateAttributes();
   }
}

function OnReset()
{

   if (cursor)
   {
      cursor.tower.SetStrength(cursor.tower.AdjustStrength(0.0, false));
      cursor.tower.SetRange(cursor.tower.AdjustRange(0.0, false));
      cursor.tower.SetFireRate(cursor.tower.AdjustFireRate(0.0, false));
      cursor.tower.ResetAttributePoints();
   }
   OnUpdateAttributes();
}

function OnWhite()
{
   cursor.tower.SetColor(Color.white);
}

function OnBlue()
{
   cursor.tower.SetColor(Color.blue);
}

function OnMagenta()
{
   cursor.tower.SetColor(Color.magenta);
}

function OnRed()
{
   cursor.tower.SetColor(Color.red);
}

function OnYellow()
{
   cursor.tower.SetColor(Color.yellow);
}

function OnGreen()
{
   cursor.tower.SetColor(Color.green);
}

function OnCyan()
{
   cursor.tower.SetColor(Color.cyan);
}
