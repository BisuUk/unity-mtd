#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var colorArea : Transform;
var numAttributeUpgrades : int = 5;

private var cursor : DefendGUICursor;

function Start()
{
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
}

function OnSwitchTo()
{
   SwitchControlSet(0);
   UICamera.fallThrough = gameObject;
}

function OnClick()
{
   if (cursor)
   {
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
      else if (UICamera.currentTouchID == -2)
      {
         if (cursor.PrevMode())
         {
            OnAttributeBack();
            DestroyCursor();
         }
      }

   }
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
   colorArea.gameObject.active = true;
}

function SwitchControlSet(newSet : int)
{
   for (var i : int=0; i<controlAreaSets.length; i++)
   {
      Utility.SetActiveRecursive(controlAreaSets[i], (i == newSet));
   }
}

function OnUpdateAttributes()
{

}

function OnRange()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;
   var norm : float = cursor.tower.AdjustRange(cursor.tower.range, true);
   var val : float = 0.0;
   if (UICamera.currentTouchID == -1)
   {
      val = norm + 1.0/numAttributeUpgrades;
      if (val > 1.0)
         val = 1.0;
   }
   else if (UICamera.currentTouchID == -2)
   {
      val = norm - 1.0/numAttributeUpgrades;
      if (val < 0.0)
         val = 0.0;
   }
   cursor.tower.SetRange(cursor.tower.AdjustRange(val, false));
   OnUpdateAttributes();
}

function OnStrength()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;
   var norm : float = cursor.tower.AdjustStrength(cursor.tower.strength, true);
   var val : float = 0.0;
   if (UICamera.currentTouchID == -1)
   {
      val = norm + 1.0/numAttributeUpgrades;
      if (val > 1.0)
         val = 1.0;
   }
   else if (UICamera.currentTouchID == -2)
   {
      val = norm - 1.0/numAttributeUpgrades;
      if (val < 0.0)
         val = 0.0;
   }
   cursor.tower.SetStrength(cursor.tower.AdjustStrength(val, false));
   OnUpdateAttributes();
}

function OnRate()
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;
   var norm : float = cursor.tower.AdjustFireRate(cursor.tower.fireRate, true);
   var val : float = 0.0;
   if (UICamera.currentTouchID == -1)
   {
      val = norm + 1.0/numAttributeUpgrades;
      if (val > 1.0)
         val = 1.0;
   }
   else if (UICamera.currentTouchID == -2)
   {
      val = norm - 1.0/numAttributeUpgrades;
      if (val < 0.0)
         val = 0.0;
   }
   cursor.tower.SetFireRate(cursor.tower.AdjustFireRate(val, false));
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
