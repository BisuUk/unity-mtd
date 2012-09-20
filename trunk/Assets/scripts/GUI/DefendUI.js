#pragma strict
#pragma downcast

var controlAreaSets : Transform[];
var colorArea : Transform;
var attributeLabel : UILabel;
var strengthButton: UIButton;
var rateButton : UIButton;
var rangeButton : UIButton;
var revertButton : UIButton;
var sellButton : UIButton;
var applyButton : UIButton;
var selectionBox : SelectionBox;
var dragDistanceThreshold : float = 10.0;
var creditsLabel : UILabel;
var scoreLabel : UILabel;
var timeLabel : UILabel;

private var towerCursor : DefendUICursor;
private var abilityCursor : AbilityBase;
private var cameraControl : CameraControl;
private var isDragging : boolean;
private var strengthLabel : UILabel;
private var rateLabel : UILabel;
private var rangeLabel : UILabel;

function Start()
{
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
   isDragging = false;

   strengthLabel = strengthButton.transform.Find("Label").GetComponent(UILabel);
   rateLabel = rateButton.transform.Find("Label").GetComponent(UILabel);
   rangeLabel = rangeButton.transform.Find("Label").GetComponent(UILabel);
}

function Update()
{
   // WASD camera movement
   if (Input.GetKey(KeyCode.A))
      cameraControl.Pan(new Vector2(5,0));
   else if (Input.GetKey(KeyCode.D))
      cameraControl.Pan(new Vector2(-5,0));

   if (Input.GetKey(KeyCode.W))
      cameraControl.Zoom(0.1);
   else if (Input.GetKey(KeyCode.S))
      cameraControl.Zoom(-0.1);

   // Title bar
   scoreLabel.text = Game.control.score.ToString();

   creditsLabel.text = Game.player.credits.ToString();

   var minutes : float = Mathf.Floor(Game.control.roundTimeRemaining/60.0);
   var seconds : float = Mathf.Floor(Game.control.roundTimeRemaining%60.0);
   timeLabel.text = minutes.ToString("#0")+":"+seconds.ToString("#00");
}

function OnSwitchTo()
{
   Game.player.ClearAllSelections();
   cameraControl = Camera.main.GetComponent(CameraControl);
   SwitchControlSet(0);
   UICamera.fallThrough = gameObject;
}

function OnClick()
{
   // LMB
   if (UICamera.currentTouchID == -1)
   {
      if (towerCursor)
      {
         // Click to place new tower cursor
         if (towerCursor.legalLocation == false)
            GUIControl.OnScreenMessage("Invalid tower location.", Color.red, 1.5);
         else
         {
            // Go to next mode, if return true it's time to place a new tower
            if (towerCursor.NextMode())
            {
               // NOTE: Client is calculating cost, unsecure.
               //Game.player.credits -= costValue;

               // Place tower in scene
               if (!Network.isClient)
                  Game.control.CreateTower(
                     towerCursor.tower.type,
                     towerCursor.transform.position, towerCursor.transform.rotation,
                     towerCursor.tower.attributePoints[AttributeType.STRENGTH],
                     towerCursor.tower.attributePoints[AttributeType.FIRERATE],
                     towerCursor.tower.attributePoints[AttributeType.RANGE],
                     towerCursor.tower.color.r, towerCursor.tower.color.g, towerCursor.tower.color.b,
                     towerCursor.tower.FOV.position);
               else
                  Game.control.netView.RPC("CreateTower", RPCMode.Server,
                     towerCursor.tower.type,
                     towerCursor.transform.position, towerCursor.transform.rotation,
                     towerCursor.tower.attributePoints[AttributeType.STRENGTH],
                     towerCursor.tower.attributePoints[AttributeType.FIRERATE],
                     towerCursor.tower.attributePoints[AttributeType.RANGE],
                     towerCursor.tower.color.r, towerCursor.tower.color.g, towerCursor.tower.color.b,
                     towerCursor.tower.FOV.position);
               // Reset cursor
               towerCursor.SetMode(0);
            }
         }
      }
      else if (abilityCursor)
      {
         // TODO:Check cost

         // Cast ability
         if (!Network.isClient)
            Game.control.CastAbility(
               abilityCursor.ID,
               abilityCursor.transform.position,
               abilityCursor.transform.localScale,
               abilityCursor.color.r,
               abilityCursor.color.g,
               abilityCursor.color.b,
               new NetworkMessageInfo());
         else
            Game.control.netView.RPC("CastAbility", RPCMode.Server,
               abilityCursor.ID,
               abilityCursor.transform.position,
               abilityCursor.transform.localScale,
               abilityCursor.color.r,
               abilityCursor.color.g,
               abilityCursor.color.b);
      }
   }
   // RMB
   else if (UICamera.currentTouchID == -2)
   {
      if (towerCursor)
      {
         // If we're dragging, move camera.
         // Otherwise go to previous cursor mode
         if (!isDragging && towerCursor.PrevMode())
         {
            OnAttributeBack();
            DestroyTowerCursor();
         }
      }
      else if (abilityCursor)
      {
         DestroyAbilityCursor();
         Utility.SetActiveRecursive(colorArea, false);
      }
      else // No cursors
      {
         if (!isDragging)
         {
            Game.player.ClearSelectedTowers();
            SwitchControlSet(0);
            Utility.SetActiveRecursive(colorArea, false);
         }
      }
      isDragging = false;
   }
}

function OnDoubleClick()
{
   if (!towerCursor && UICamera.currentTouchID == -1)
      cameraControl.SnapToFocusLocation();
}

function OnPress(isPressed : boolean)
{
   // LMB
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (isPressed)
         {
            selectionBox._dragStartPosition = Input.mousePosition;
            selectionBox._dragEndPosition = Input.mousePosition;
            // Checks if selections have changed via tower OnMouseDown()
            if (Game.player.selectedTowers.Count>0)
               SwitchControlSet(1);
         }
         else
         {
            if (selectionBox._isDragging)
            {
               var append : boolean = Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
               if (!append)
                  Game.player.ClearSelectedTowers();

               selectionBox.Select();
               var somethingSelected : boolean = false;
               for (var go : GameObject in selectionBox.selectedObjects)
               {
                  somethingSelected = true;
                  Game.player.SelectTower(go.GetComponent(Tower), true);
               }
               if (somethingSelected)
                  SwitchControlSet(1);
            }
         }
         selectionBox._isDragging = false;
      break;
   }
}

function OnDrag(delta : Vector2)
{
   switch (UICamera.currentTouchID)
   {
      // LMB
      case -1:
         if (!towerCursor && !abilityCursor && ((selectionBox._dragStartPosition-Input.mousePosition).magnitude)>dragDistanceThreshold)
         {
            selectionBox._isDragging = true;
            selectionBox._dragEndPosition = Input.mousePosition;
         }
      break;
      // RMB
      case -2:
         cameraControl.Rotate(delta);
         isDragging = true;
      break;
      // MMB
      case -3:
         cameraControl.Pan(delta);
      break;
   }
}

function OnScroll(delta : float)
{
   cameraControl.Zoom(delta);
}

function OnGUI()
{
   var e : Event = Event.current;

   // Keyboard input
   if (e.isKey && e.type==EventType.KeyDown)
   {
      switch (e.keyCode)
      {
      case KeyCode.R:
         if (!e.shift)
            cameraControl.SnapToTopDownView();
         else
            cameraControl.SnapToDefaultView(Game.player.isAttacker);
         break;

      case KeyCode.F:
         cameraControl.SnapToFocusLocation();
         break;

      case KeyCode.Escape:
         GUIControl.SwitchGUI(2); // in game menu
         break;
      }
   }
}

function NewTowerCursor(type : int)
{
   DestroyTowerCursor();
   DestroyAbilityCursor();

   var prefabName : String = TowerUtil.PrefabName(type);
   var cursorObject : GameObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "DefendTowerCursor";
   cursorObject.tag = "";
   cursorObject.GetComponent(Collider).enabled = false;
   towerCursor = cursorObject.AddComponent(DefendUICursor);
   towerCursor.SetMode(0);

   cursorObject.SendMessage("SetDefaultBehaviorEnabled", false); // remove default behavior
}

function DestroyTowerCursor()
{
   if (towerCursor)
   {
      for (var child : Transform in towerCursor.transform)
         Destroy(child.gameObject);
      Destroy(towerCursor.gameObject);
   }
}

function NewAbilityCursor(type : int)
{
   DestroyTowerCursor();
   DestroyAbilityCursor();

   var cursorObject : GameObject = Instantiate(Resources.Load(AbilityBase.GetPrefabName(type), GameObject), Vector3.zero, Quaternion.identity);
   cursorObject.name = "DefendAbilityCursor";
   cursorObject.tag = "";
   cursorObject.SendMessage("MakeCursor", true);
   cursorObject.collider.enabled = false;
   abilityCursor = cursorObject.GetComponent(AbilityBase);
}

function DestroyAbilityCursor()
{
   if (abilityCursor)
   {
      for (var child : Transform in abilityCursor.transform)
         Destroy(child.gameObject);
      Destroy(abilityCursor.gameObject);
   }
}

function OnAttributeBack()
{
   DestroyTowerCursor();
   Game.player.ClearSelectedTowers();
   SwitchControlSet(0);
   Utility.SetActiveRecursive(colorArea, false);
}

function OnMortarTower()
{
   NewTowerCursor(3);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnRangedTower()
{
   NewTowerCursor(1);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnSlowTower()
{
   NewTowerCursor(4);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnPainterTower()
{
   NewTowerCursor(2);
   SwitchControlSet(1);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnBlastAbility()
{
   NewAbilityCursor(101);
   Utility.SetActiveRecursive(colorArea, true);
}

function OnPaintAbility()
{
   NewAbilityCursor(102);
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
   {
      Utility.SetActiveRecursive(revertButton.transform, (towerCursor==null));
      Utility.SetActiveRecursive(sellButton.transform, (towerCursor==null));
      Utility.SetActiveRecursive(applyButton.transform, (towerCursor==null));
      Utility.SetActiveRecursive(attributeLabel.transform, (towerCursor!=null || Game.player.selectedTowers.Count==1));
      OnUpdateAttributes();
   }
}

function OnUpdateAttributes()
{
   var t : Tower = null;

   if (Game.player.selectedTowers.Count>1)
   {
      strengthLabel.text = "-";
      rateLabel.text = "-";
      rangeLabel.text = "-";
      attributeLabel.text = "-";
   }
   else
   {
      if (towerCursor)
      {
         Game.player.ClearSelectedTowers();
         t = towerCursor.tower;
      }
      else if (Game.player.selectedTowers.Count==1)
         t = Game.player.selectedTowers[0].tower;
   
      if (t)
      {
         strengthLabel.text = t.attributePoints[AttributeType.STRENGTH].ToString();
         rateLabel.text = t.attributePoints[AttributeType.FIRERATE].ToString();
         rangeLabel.text = t.attributePoints[AttributeType.RANGE].ToString();
         attributeLabel.text = t.UsedAttributePoints()+"/"+t.maxAttributePoints;
      }
   }
}

function OnStrength()
{
   ModifyAttributePoint(AttributeType.STRENGTH);
}

function OnRate()
{
   ModifyAttributePoint(AttributeType.FIRERATE);
}

function OnRange()
{
   ModifyAttributePoint(AttributeType.RANGE);
}

function ModifyAttributePoint(type : AttributeType)
{
   if (UICamera.currentTouchID < -2 || UICamera.currentTouchID > -1)
      return;

   var t : Tower = null;

   if (Game.player.selectedTowers.Count > 1)
   {
      for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
      {
         t = Game.player.selectedTowers[i].tower;
         if (t)
         {
            if (UICamera.currentTouchID == -1)
               t.ModifyAttributePoints(type, 1);
            else if (UICamera.currentTouchID == -2)
               t.ModifyAttributePoints(type, -1);
         }
      }
   }
   else
   {
      if (towerCursor)
         t = towerCursor.tower;
      else if (Game.player.selectedTowers.Count == 1)
         t = Game.player.selectedTowers[0].tower;

      if (t)
      {
         if (UICamera.currentTouchID == -1)
         {
            if (t.ModifyAttributePoints(type, 1))
               OnUpdateAttributes();
            else
               GUIControl.OnScreenMessage("Not enough attribute points.", Color.red, 1.5);
         }
         else if (UICamera.currentTouchID == -2)
         {
            if (t.ModifyAttributePoints(type, -1))
               OnUpdateAttributes();
         }
      }
   }
}

function OnSell()
{
   // NOTE: Iterates backwards so a remove can safely occur
   // without throwing off iterators.
   for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
   {
      //Game.player.credits += Game.player.selectedTowers[i].Cost();
      // NOTE: Client deleting object, unsecure
      if (Game.hostType>0)
         Network.Destroy(Game.player.selectedTowers[i].selectionFor.gameObject);
      else
         Destroy(Game.player.selectedTowers[i].selectionFor.gameObject);
   }
   Game.player.ClearSelectedTowers();
   SwitchControlSet(0);
}

function OnRevert()
{
   for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
      Game.player.selectedTowers[i].tower.CopyAttributePoints(Game.player.selectedTowers[i].selectionFor);

   OnUpdateAttributes();
}

function OnReset()
{
   if (towerCursor)
      towerCursor.tower.ResetAttributePoints();
   else
   {
      for (var i : int = Game.player.selectedTowers.Count-1; i >= 0; --i)
         Game.player.selectedTowers[i].tower.ResetAttributePoints();
   }
   OnUpdateAttributes();
}

function OnApply()
{
   var s : TowerSelection = null;
   var count : int = Game.player.selectedTowers.Count;

   for (var i : int = count-1; i >= 0; --i)
   {
      s = Game.player.selectedTowers[i];

      // No attributes changed
      if (!s.hasNewSettings)
         continue;

      // Legally placed
      if (!s.tower.legalLocation) //costValue <= Game.player.credits && )
      {
         if (count==1)
            GUIControl.OnScreenMessage("Not enough space for upgraded tower.", Color.red, 1.5);
         continue;
      }

      // Under construction
      if (s.selectionFor.isConstructing)
         continue;

      // Send modify command
      if (!Network.isClient)
        s.selectionFor.Modify(
            s.tower.attributePoints[AttributeType.STRENGTH],
            s.tower.attributePoints[AttributeType.FIRERATE],
            s.tower.attributePoints[AttributeType.RANGE]);
      else
         s.selectionFor.netView.RPC("Modify", RPCMode.Server,
            s.tower.attributePoints[AttributeType.STRENGTH],
            s.tower.attributePoints[AttributeType.FIRERATE],
            s.tower.attributePoints[AttributeType.RANGE]);
      // Reset tower selection to new settings
      s.SetSelectionFor(s.selectionFor);
   }
}

function OnWhite()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.white, false);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.white);
}

function OnBlue()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.blue, false);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.blue);
}

function OnMagenta()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.magenta, false);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.magenta);
}

function OnRed()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.red, false);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.red);
}

function OnYellow()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.yellow, false);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.yellow);
}

function OnGreen()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.green, false);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.green);
}

function OnCyan()
{
   if (towerCursor)
      towerCursor.tower.SetColor(Color.cyan, false);
   else if (abilityCursor)
      abilityCursor.SetColor(Color.cyan);
}
