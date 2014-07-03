PHPView 0.1.3
=============

Chrome extension for pretty printing php print_r outputs.

For example, by doing this in your PHP file:
```php
    $array = array('element' => 'value');
    echo '<pre>';
    print_r($array); die;
```

Instead of displaying this:
```
    <pre>Array
    (
        [element] => value 
    )
```

We will see this in Chrome: 
```js
    [{"element": "value"}]
```
Allows you to collapse branches.
